/**
 * WebSocket 完整示例 - 聊天室应用
 * 
 * 演示功能：
 * 1. WebSocket Gateway 基础
 * 2. 房间管理（加入/离开）
 * 3. 广播消息
 * 4. 私聊功能
 * 5. 在线用户列表
 * 6. 连接生命周期管理
 * 
 * 运行方式：
 *   bun run examples/03-advanced/websocket-chat-app.ts
 * 
 * 测试：
 *   访问 http://localhost:3600 打开 Web UI
 */

import {
  Application,
  Controller,
  GET,
  Injectable,
  Module,
  OnMessage,
  OnClose,
  OnOpen,
  WebSocketGateway,
  ResponseBuilder,
} from '@dangao/bun-server';
import type { ServerWebSocket } from 'bun';
import type { WebSocketConnectionData } from '@dangao/bun-server';

// ==================== 数据模型 ====================

interface User {
  id: string;
  username: string;
  avatar: string;
}

interface ChatMessage {
  type: 'join' | 'leave' | 'message' | 'private' | 'users' | 'error' | 'welcome';
  from?: string;
  fromId?: string;  // 发送者的 userId
  to?: string;
  room?: string;
  content?: string;
  users?: User[];
  userId?: string;      // 当前用户的 userId
  username?: string;    // 当前用户的 username
  timestamp: number;
}

interface RoomInfo {
  name: string;
  users: Set<string>;
}

// ==================== 聊天服务 ====================

@Injectable()
class ChatService {
  // 存储所有连接：userId -> WebSocket
  private readonly connections = new Map<string, ServerWebSocket<ChatWebSocketData>>();
  
  // 存储用户信息：userId -> User
  private readonly users = new Map<string, User>();
  
  // 存储房间信息：roomName -> RoomInfo
  private readonly rooms = new Map<string, RoomInfo>();

  /**
   * 用户上线
   */
  public userOnline(userId: string, username: string, ws: ServerWebSocket<ChatWebSocketData>) {
    this.connections.set(userId, ws);
    this.users.set(userId, {
      id: userId,
      username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    });
    
    console.log(`[Chat] User ${username} (${userId}) connected`);
  }

  /**
   * 用户下线
   */
  public userOffline(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      // 离开所有房间
      for (const [roomName, room] of this.rooms.entries()) {
        if (room.users.has(userId)) {
          this.leaveRoom(userId, roomName);
        }
      }
      
      this.connections.delete(userId);
      this.users.delete(userId);
      
      console.log(`[Chat] User ${user.username} (${userId}) disconnected`);
    }
  }

  /**
   * 加入房间
   */
  public joinRoom(userId: string, roomName: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    let room = this.rooms.get(roomName);
    if (!room) {
      room = { name: roomName, users: new Set() };
      this.rooms.set(roomName, room);
      console.log(`[Chat] Room "${roomName}" created`);
    }

    room.users.add(userId);
    console.log(`[Chat] User ${user.username} joined room "${roomName}"`);

    // 通知房间内其他用户
    this.broadcastToRoom(roomName, {
      type: 'join',
      from: user.username,
      room: roomName,
      content: `${user.username} joined the room`,
      timestamp: Date.now(),
    }, userId);

    return true;
  }

  /**
   * 离开房间
   */
  public leaveRoom(userId: string, roomName: string): boolean {
    const user = this.users.get(userId);
    const room = this.rooms.get(roomName);
    
    if (!user || !room) return false;

    room.users.delete(userId);
    console.log(`[Chat] User ${user.username} left room "${roomName}"`);

    // 通知房间内其他用户
    this.broadcastToRoom(roomName, {
      type: 'leave',
      from: user.username,
      room: roomName,
      content: `${user.username} left the room`,
      timestamp: Date.now(),
    });

    // 如果房间为空，删除房间
    if (room.users.size === 0) {
      this.rooms.delete(roomName);
      console.log(`[Chat] Room "${roomName}" deleted (empty)`);
    }

    return true;
  }

  /**
   * 广播消息到房间
   */
  public broadcastToRoom(roomName: string, message: ChatMessage, excludeUserId?: string) {
    const room = this.rooms.get(roomName);
    if (!room) return;

    for (const userId of room.users) {
      if (userId === excludeUserId) continue;
      
      const ws = this.connections.get(userId);
      if (ws) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * 发送私聊消息
   */
  public sendPrivateMessage(fromUserId: string, toUserId: string, content: string): boolean {
    const fromUser = this.users.get(fromUserId);
    const toWs = this.connections.get(toUserId);

    if (!fromUser || !toWs) return false;

    const message: ChatMessage = {
      type: 'private',
      from: fromUser.username,
      to: toUserId,
      content,
      timestamp: Date.now(),
    };

    toWs.send(JSON.stringify(message));
    return true;
  }

  /**
   * 获取房间内的在线用户列表
   */
  public getRoomUsers(roomName: string): User[] {
    const room = this.rooms.get(roomName);
    if (!room) return [];

    return Array.from(room.users)
      .map(userId => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }

  /**
   * 获取所有在线用户
   */
  public getAllOnlineUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * 获取用户信息
   */
  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * 发送消息给特定用户
   */
  public sendToUser(userId: string, message: ChatMessage) {
    const ws = this.connections.get(userId);
    if (ws) {
      ws.send(JSON.stringify(message));
    }
  }
}

// ==================== WebSocket Gateway ====================

// 扩展 WebSocketConnectionData 以存储用户 ID
interface ChatWebSocketData extends WebSocketConnectionData {
  userId?: string;
}

@WebSocketGateway('/ws/chat')
class ChatGateway {
  public constructor(private readonly chatService: ChatService) {}

  /**
   * 连接建立
   */
  @OnOpen
  public handleOpen(ws: ServerWebSocket<ChatWebSocketData>) {
    // 生成唯一用户 ID（实际应用中应该从查询参数或认证 token 中获取）
    // 例如：ws.data.query?.get('userId') 或从 JWT token 解析
    const userId = crypto.randomUUID();
    const username = ws.data.query?.get('username') || `User${userId.substring(0, 6)}`;
    
    // 存储用户 ID 到连接数据
    ws.data.userId = userId;
    
    this.chatService.userOnline(userId, username, ws);

    // 发送欢迎消息，包含用户信息
    ws.send(JSON.stringify({
      type: 'welcome',
      userId,
      username,
      content: `Welcome ${username}! You are now connected.`,
      timestamp: Date.now(),
    }));
  }

  /**
   * 接收消息
   */
  @OnMessage
  public handleMessage(
    ws: ServerWebSocket<ChatWebSocketData>,
    message: string,
  ) {
    const userId = ws.data.userId;
    if (!userId) {
      ws.send(JSON.stringify({
        type: 'error',
        content: 'User ID not found',
        timestamp: Date.now(),
      }));
      return;
    }
    
    try {
      const data = JSON.parse(message);
      
      switch (data.action) {
        case 'join_room':
          this.handleJoinRoom(userId, data.room, ws);
          break;
        
        case 'leave_room':
          this.handleLeaveRoom(userId, data.room, ws);
          break;
        
        case 'send_message':
          this.handleSendMessage(userId, data.room, data.content, ws);
          break;
        
        case 'private_message':
          this.handlePrivateMessage(userId, data.to, data.content, ws);
          break;
        
        case 'get_users':
          this.handleGetUsers(userId, data.room, ws);
          break;
        
        default:
          ws.send(JSON.stringify({
            type: 'error',
            content: `Unknown action: ${data.action}`,
            timestamp: Date.now(),
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Invalid message format',
        timestamp: Date.now(),
      }));
    }
  }

  /**
   * 连接关闭
   */
  @OnClose
  public handleClose(ws: ServerWebSocket<ChatWebSocketData>) {
    const userId = ws.data.userId;
    if (userId) {
      this.chatService.userOffline(userId);
    }
  }

  // ==================== 消息处理器 ====================

  private handleJoinRoom(
    userId: string,
    roomName: string,
    ws: ServerWebSocket<ChatWebSocketData>,
  ) {
    const success = this.chatService.joinRoom(userId, roomName);
    
    if (success) {
      // 发送房间用户列表
      const users = this.chatService.getRoomUsers(roomName);
      ws.send(JSON.stringify({
        type: 'users',
        room: roomName,
        users,
        timestamp: Date.now(),
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Failed to join room',
        timestamp: Date.now(),
      }));
    }
  }

  private handleLeaveRoom(
    userId: string,
    roomName: string,
    ws: ServerWebSocket<ChatWebSocketData>,
  ) {
    const success = this.chatService.leaveRoom(userId, roomName);
    
    if (!success) {
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Failed to leave room',
        timestamp: Date.now(),
      }));
    }
  }

  private handleSendMessage(
    userId: string,
    roomName: string,
    content: string,
    ws: ServerWebSocket<ChatWebSocketData>,
  ) {
    const user = this.chatService.getUser(userId);
    if (!user) {
      ws.send(JSON.stringify({
        type: 'error',
        content: 'User not found',
        timestamp: Date.now(),
      }));
      return;
    }

    const message = {
      type: 'message' as const,
      from: user.username,  // 使用 username 而不是 userId
      fromId: userId,       // 添加 userId 用于前端识别自己的消息
      room: roomName,
      content,
      timestamp: Date.now(),
    };

    // 广播消息到房间（包括发送者）
    // 前端会根据 fromId 判断是否是自己的消息
    this.chatService.broadcastToRoom(roomName, message);
  }

  private handlePrivateMessage(
    fromUserId: string,
    toUserId: string,
    content: string,
    ws: ServerWebSocket<ChatWebSocketData>,
  ) {
    const success = this.chatService.sendPrivateMessage(fromUserId, toUserId, content);
    
    if (!success) {
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Failed to send private message (user not found)',
        timestamp: Date.now(),
      }));
    }
  }

  private handleGetUsers(
    userId: string,
    roomName: string | undefined,
    ws: ServerWebSocket<ChatWebSocketData>,
  ) {
    const users = roomName
      ? this.chatService.getRoomUsers(roomName)
      : this.chatService.getAllOnlineUsers();
    
    ws.send(JSON.stringify({
      type: 'users',
      room: roomName,
      users,
      timestamp: Date.now(),
    }));
  }
}

// ==================== Web UI Controller ====================

@Controller('/')
class FrontendController {
  @GET('/')
  public index() {
    return ResponseBuilder.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebSocket 聊天室</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    .status {
      font-size: 14px;
      opacity: 0.9;
    }
    .reset-user {
      display: inline-block;
      margin-left: 10px;
      padding: 2px 8px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }
    .reset-user:hover {
      background: rgba(255,255,255,0.3);
    }
    .container {
      flex: 1;
      display: flex;
      max-width: 1200px;
      width: 100%;
      margin: 20px auto;
      gap: 20px;
      padding: 0 20px;
      overflow: hidden;
    }
    .sidebar {
      width: 250px;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
    }
    .sidebar h3 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
    }
    .room-input {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .room-input input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .room-input button {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .room-input button:hover {
      background: #5568d3;
    }
    .user-list {
      list-style: none;
      overflow-y: auto;
    }
    .user-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 5px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .user-item:hover {
      background: #f5f5f5;
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }
    .user-name {
      font-size: 14px;
      color: #333;
    }
    .chat-area {
      flex: 1;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .message {
      display: flex;
      gap: 10px;
      max-width: 70%;
    }
    .message.own {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .message-content {
      background: #f0f0f0;
      padding: 10px 15px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
    }
    .message.own .message-content {
      background: #667eea;
      color: white;
    }
    .message-meta {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
    .system-message {
      text-align: center;
      color: #999;
      font-size: 13px;
      padding: 5px;
    }
    .input-area {
      padding: 20px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
    }
    .input-area input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }
    .input-area button {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .input-area button:hover {
      background: #5568d3;
    }
    .input-area button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💬 WebSocket 聊天室</h1>
    <div class="status" id="status">连接中...</div>
    <div class="status" id="userInfo" style="margin-top: 5px; font-size: 13px;"></div>
  </div>

  <div class="container">
    <div class="sidebar">
      <h3>📍 加入房间</h3>
      <div class="room-input">
        <input type="text" id="roomInput" placeholder="房间名称" value="general">
        <button onclick="joinRoom()">加入</button>
      </div>
      
      <h3>👥 在线用户</h3>
      <ul class="user-list" id="userList"></ul>
    </div>

    <div class="chat-area">
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <input 
          type="text" 
          id="messageInput" 
          placeholder="输入消息..." 
          onkeypress="if(event.key==='Enter') sendMessage()"
        >
        <button onclick="sendMessage()" id="sendBtn" disabled>发送</button>
      </div>
    </div>
  </div>

  <script>
    let ws;
    let currentRoom = null;
    let currentUserId = null;
    let currentUsername = null;

    function connect() {
      // 从 localStorage 恢复用户名，或生成新的
      let savedUsername = localStorage.getItem('chat_username');
      if (!savedUsername) {
        savedUsername = 'User' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('chat_username', savedUsername);
      }
      
      // HTTPS 页面必须使用 wss，HTTP 页面使用 ws
      const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(\`\${wsProtocol}//\${location.host}/ws/chat?username=\${savedUsername}\`);
      
      ws.onopen = () => {
        document.getElementById('status').textContent = '✅ 已连接';
        document.getElementById('sendBtn').disabled = false;
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
      };
      
      ws.onclose = () => {
        document.getElementById('status').textContent = '❌ 连接断开';
        document.getElementById('sendBtn').disabled = true;
        setTimeout(connect, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    function handleMessage(message) {
      const messagesDiv = document.getElementById('messages');
      
      switch (message.type) {
        case 'welcome':
          // 保存当前用户信息
          currentUserId = message.userId;
          currentUsername = message.username;
          localStorage.setItem('chat_userId', currentUserId);
          localStorage.setItem('chat_username', currentUsername);
          
          // 显示用户信息（包含重置按钮）
          document.getElementById('userInfo').innerHTML = 
            \`👤 当前用户: \${currentUsername} <span class="reset-user" onclick="resetUser()" title="重置用户身份">🔄 重置</span>\`;
          
          addSystemMessage(message.content);
          break;
        
        case 'join':
        case 'leave':
          addSystemMessage(message.content);
          break;
        
        case 'message':
          addChatMessage(message);
          break;
        
        case 'users':
          updateUserList(message.users);
          break;
        
        case 'error':
          addSystemMessage('❌ ' + message.content);
          break;
      }
    }

    function addSystemMessage(content) {
      const messagesDiv = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'system-message';
      div.textContent = content;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addChatMessage(message) {
      const messagesDiv = document.getElementById('messages');
      const div = document.createElement('div');
      
      // 判断是否是自己发送的消息
      const isOwn = message.fromId === currentUserId;
      div.className = isOwn ? 'message own' : 'message';
      
      div.innerHTML = \`
        <div class="message-content">
          <div>\${message.content}</div>
          <div class="message-meta">
            \${message.from} · \${new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      \`;
      
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function updateUserList(users) {
      const userList = document.getElementById('userList');
      userList.innerHTML = users.map(user => {
        const isSelf = user.id === currentUserId;
        const selfBadge = isSelf ? ' <span style="color:#667eea;font-weight:bold;">(你)</span>' : '';
        return \`
          <li class="user-item" style="\${isSelf ? 'background:#f0f4ff;' : ''}">
            <img src="\${user.avatar}" class="user-avatar" alt="\${user.username}">
            <span class="user-name">\${user.username}\${selfBadge}</span>
          </li>
        \`;
      }).join('');
    }

    function joinRoom() {
      const roomInput = document.getElementById('roomInput');
      const room = roomInput.value.trim();
      
      if (!room || !ws || ws.readyState !== WebSocket.OPEN) return;
      
      if (currentRoom) {
        ws.send(JSON.stringify({
          action: 'leave_room',
          room: currentRoom
        }));
      }
      
      ws.send(JSON.stringify({
        action: 'join_room',
        room: room
      }));
      
      currentRoom = room;
      document.getElementById('messages').innerHTML = '';
      addSystemMessage(\`已加入房间: \${room}\`);
      
      // 请求用户列表
      setTimeout(() => {
        ws.send(JSON.stringify({
          action: 'get_users',
          room: room
        }));
      }, 100);
    }

    function sendMessage() {
      const input = document.getElementById('messageInput');
      const content = input.value.trim();
      
      if (!content || !currentRoom || !ws || ws.readyState !== WebSocket.OPEN) return;
      
      ws.send(JSON.stringify({
        action: 'send_message',
        room: currentRoom,
        content: content
      }));
      
      input.value = '';
    }

    // 重置用户身份
    function resetUser() {
      if (confirm('确定要重置用户身份吗？这将断开当前连接并生成新的用户名。')) {
        localStorage.removeItem('chat_userId');
        localStorage.removeItem('chat_username');
        location.reload();
      }
    }

    // 页面加载时尝试恢复之前的用户信息
    const savedUserId = localStorage.getItem('chat_userId');
    const savedUsername = localStorage.getItem('chat_username');
    if (savedUserId && savedUsername) {
      currentUserId = savedUserId;
      currentUsername = savedUsername;
      document.getElementById('userInfo').innerHTML = 
        \`👤 当前用户: \${savedUsername} <span class="reset-user" onclick="resetUser()" title="重置用户身份">🔄 重置</span>\`;
    }

    // 启动连接
    connect();
    
    // 自动加入默认房间
    setTimeout(() => joinRoom(), 800);
  </script>
</body>
</html>
    `);
  }
}

// ==================== 应用启动 ====================

@Module({
  controllers: [FrontendController],
  providers: [ChatService],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3600);
const app = new Application({ port });

app.registerModule(AppModule);
app.registerWebSocketGateway(ChatGateway);

app.listen();

console.log(`🚀 WebSocket Chat Server running on http://localhost:${port}`);
console.log(`💬 Open http://localhost:${port} in multiple browser tabs to test`);
console.log(`\n📝 WebSocket message format:`);
console.log(`  { "action": "join_room", "room": "general" }`);
console.log(`  { "action": "send_message", "room": "general", "content": "Hello!" }`);
console.log(`  { "action": "get_users", "room": "general" }`);
console.log(`\n🧪 Try it with websocat:`);
console.log(`  # Install websocat: brew install websocat`);
console.log(`  websocat ws://localhost:${port}/ws/chat`);
console.log(`  # Then send JSON messages like above`);
console.log(`\n🧪 Or use browser console:`);
console.log(`  const ws = new WebSocket('ws://localhost:${port}/ws/chat');`);
console.log(`  ws.onmessage = (e) => console.log(JSON.parse(e.data));`);
console.log(`  ws.send(JSON.stringify({ action: "join_room", room: "general" }));`);