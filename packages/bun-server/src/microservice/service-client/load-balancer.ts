import type { ServiceInstance } from '../service-registry/types';
import type { LoadBalancer, LoadBalanceStrategy } from './types';

/**
 * 随机负载均衡器
 */
export class RandomLoadBalancer implements LoadBalancer {
  public select(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * instances.length);
    return instances[index] ?? null;
  }
}

/**
 * 轮询负载均衡器
 */
export class RoundRobinLoadBalancer implements LoadBalancer {
  private currentIndex: number = 0;

  public select(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) {
      return null;
    }

    const instance = instances[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % instances.length;
    return instance ?? null;
  }

  /**
   * 重置轮询索引
   */
  public reset(): void {
    this.currentIndex = 0;
  }
}

/**
 * 加权轮询负载均衡器
 */
export class WeightedRoundRobinLoadBalancer implements LoadBalancer {
  private currentIndex: number = 0;
  private currentWeight: number = 0;
  private maxWeight: number = 0;

  public select(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) {
      return null;
    }

    // 过滤掉权重为 0 或未定义的实例
    const validInstances = instances.filter((inst) => (inst.weight ?? 1) > 0);
    if (validInstances.length === 0) {
      return instances[0] ?? null;
    }

    // 计算最大权重
    this.maxWeight = Math.max(...validInstances.map((inst) => inst.weight ?? 1));

    // 加权轮询算法
    while (true) {
      this.currentIndex = (this.currentIndex + 1) % validInstances.length;
      if (this.currentIndex === 0) {
        this.currentWeight = this.currentWeight - 1;
        if (this.currentWeight <= 0) {
          this.currentWeight = this.maxWeight;
        }
      }

      const instance = validInstances[this.currentIndex];
      const weight = instance.weight ?? 1;

      if (weight >= this.currentWeight) {
        return instance;
      }
    }
  }

  /**
   * 重置轮询状态
   */
  public reset(): void {
    this.currentIndex = 0;
    this.currentWeight = 0;
    this.maxWeight = 0;
  }
}

/**
 * 一致性哈希负载均衡器
 */
export class ConsistentHashLoadBalancer implements LoadBalancer {
  private readonly virtualNodes: number = 160; // 虚拟节点数

  public select(instances: ServiceInstance[], key?: string): ServiceInstance | null {
    if (instances.length === 0) {
      return null;
    }

    if (!key) {
      // 如果没有提供 key，使用随机选择
      const index = Math.floor(Math.random() * instances.length);
      return instances[index] ?? null;
    }

    // 构建虚拟节点环
    const ring: Array<{ hash: number; instance: ServiceInstance }> = [];

    for (const instance of instances) {
      const instanceKey = `${instance.ip}:${instance.port}`;
      for (let i = 0; i < this.virtualNodes; i++) {
        const virtualKey = `${instanceKey}#${i}`;
        const hash = this.hash(virtualKey);
        ring.push({ hash, instance });
      }
    }

    // 排序
    ring.sort((a, b) => a.hash - b.hash);

    // 计算 key 的哈希值
    const keyHash = this.hash(key);

    // 找到第一个大于等于 keyHash 的节点
    for (const node of ring) {
      if (node.hash >= keyHash) {
        return node.instance;
      }
    }

    // 如果没有找到，返回第一个节点（环）
    return ring[0]?.instance ?? null;
  }

  /**
   * 简单的字符串哈希函数（FNV-1a）
   */
  private hash(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; // 转换为无符号整数
  }
}

/**
 * 最少连接负载均衡器（简化版：使用权重和健康状态）
 */
export class LeastActiveLoadBalancer implements LoadBalancer {
  public select(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) {
      return null;
    }

    // 过滤健康实例
    const healthyInstances = instances.filter((inst) => inst.healthy !== false);

    if (healthyInstances.length === 0) {
      // 如果没有健康实例，返回第一个
      return instances[0] ?? null;
    }

    // 按权重排序，选择权重最大的（简化实现）
    // 实际实现中应该跟踪每个实例的活跃连接数
    const sorted = [...healthyInstances].sort((a, b) => {
      const weightA = a.weight ?? 1;
      const weightB = b.weight ?? 1;
      return weightB - weightA;
    });

    return sorted[0] ?? null;
  }
}

/**
 * 负载均衡器工厂
 */
export class LoadBalancerFactory {
  /**
   * 创建负载均衡器
   */
  public static create(strategy: LoadBalanceStrategy): LoadBalancer {
    switch (strategy) {
      case 'random':
        return new RandomLoadBalancer();
      case 'roundRobin':
        return new RoundRobinLoadBalancer();
      case 'weightedRoundRobin':
        return new WeightedRoundRobinLoadBalancer();
      case 'consistentHash':
        return new ConsistentHashLoadBalancer();
      case 'leastActive':
        return new LeastActiveLoadBalancer();
      default:
        return new RoundRobinLoadBalancer();
    }
  }
}

