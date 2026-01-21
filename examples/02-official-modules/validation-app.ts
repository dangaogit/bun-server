/**
 * 验证系统示例
 *
 * 展示框架验证系统的完整功能：
 * - 参数级别验证
 * - 类级别验证（DTO）
 * - 嵌套对象验证
 * - 数组验证
 * - 自定义验证器
 * - 条件验证和转换
 *
 * 运行: bun run examples/02-official-modules/validation-app.ts
 */

import 'reflect-metadata';
import {
  Application,
  Module,
  Controller,
  Injectable,
  Inject,
  GET,
  POST,
  Body,
  Query,
  Validate,
  // 基础验证规则
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  MinLength,
  // 对象验证规则
  IsObject,
  IsNotEmpty,
  IsNotEmptyObject,
  // 数组验证规则
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  // 通用验证规则
  IsBoolean,
  IsInt,
  IsPositive,
  Min,
  Max,
  IsDate,
  IsUUID,
  Length,
  Matches,
  IsIn,
  IsUrl,
  // 条件验证规则
  ValidateIf,
  Transform,
  // 类级别验证
  ValidateClass,
  Property,
  NestedProperty,
  ArrayNestedProperty,
  validateObject,
  validateObjectSync,
  // 自定义验证器
  createSimpleValidator,
  createCustomValidator,
  createRegexValidator,
  // 内置扩展验证器
  IsPhoneNumber,
  IsBetween,
  // 错误处理
  ValidationError,
  // 日志模块
  LoggerModule,
  LOGGER_TOKEN,
  LogLevel,
  type Logger,
} from '../../packages/bun-server/src';

// ============= 自定义验证器 =============

// 简单验证器：验证是否为偶数
const IsEven = createSimpleValidator(
  'isEven',
  (value) => typeof value === 'number' && value % 2 === 0,
  '必须是偶数',
);

// 带参数的验证器：验证字符串是否以指定前缀开头
const StartsWith = createCustomValidator(
  'startsWith',
  (value: unknown, prefix: string) => typeof value === 'string' && value.startsWith(prefix),
  (prefix: string) => `必须以 "${prefix}" 开头`,
);

// 正则验证器：验证用户名格式
const IsUsername = createRegexValidator(
  'isUsername',
  /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/,
  '用户名必须以字母开头，只能包含字母、数字和下划线，长度3-20',
);

// ============= DTO 定义 =============

// 地址 DTO
@ValidateClass()
class AddressDto {
  @Property(IsString(), IsNotEmpty())
  public city: string = '';

  @Property(IsString(), IsNotEmpty())
  public street: string = '';

  @Property(IsOptional(), IsString())
  public zipCode?: string;
}

// 订单项 DTO
@ValidateClass()
class OrderItemDto {
  @Property(IsString(), MinLength(1))
  public productId: string = '';

  @Property(IsString(), IsNotEmpty())
  public name: string = '';

  @Property(IsNumber(), IsPositive())
  public price: number = 0;

  @Property(IsInt(), Min(1), Max(100))
  public quantity: number = 1;
}

// 创建用户 DTO
@ValidateClass()
class CreateUserDto {
  @Property(IsUsername())
  public username: string = '';

  @Property(IsEmail())
  public email: string = '';

  @Property(IsString(), Length(8, 32))
  public password: string = '';

  @Property(IsOptional(), IsPhoneNumber())
  public phone?: string;

  @Property(IsOptional(), IsInt(), Min(0), Max(150))
  public age?: number;

  @Property(IsIn(['user', 'admin', 'moderator']))
  public role: string = 'user';
}

// 创建订单 DTO（包含嵌套验证）
@ValidateClass()
class CreateOrderDto {
  @Property(IsUUID('4'))
  public userId: string = '';

  // 嵌套对象验证
  @NestedProperty(AddressDto)
  public shippingAddress: AddressDto = new AddressDto();

  // 嵌套对象数组验证
  @Property(IsArray(), ArrayMinSize(1), ArrayMaxSize(10))
  @ArrayNestedProperty(OrderItemDto)
  public items: OrderItemDto[] = [];

  @Property(IsOptional(), IsString(), Max(500))
  public note?: string;
}

// 高级验证 DTO（展示条件验证和转换）
@ValidateClass()
class AdvancedDto {
  @Property(IsIn(['basic', 'premium']))
  public accountType: string = 'basic';

  // 条件验证：只有高级用户才需要填写信用卡号
  @Property(ValidateIf((_, obj) => (obj as AdvancedDto).accountType === 'premium'), IsString(), Length(16, 19))
  public creditCard?: string;

  // 转换：去除空格并转小写
  @Property(Transform((v) => String(v).trim().toLowerCase()), IsEmail())
  public email: string = '';

  // 转换：字符串转数字
  @Property(Transform((v) => Number(v)), IsInt(), IsBetween(1, 100)())
  public percentage: number = 50;

  // 数组唯一性验证
  @Property(IsArray(), ArrayUnique())
  public tags: string[] = [];
}

// ============= 服务 =============

@Injectable()
class ValidationService {
  public constructor(@Inject(LOGGER_TOKEN) private readonly logger: Logger) {}

  /**
   * 验证创建用户请求
   */
  public validateCreateUser(data: unknown): CreateUserDto {
    const result = validateObjectSync(data, CreateUserDto);
    if (!result.valid) {
      this.logger.warn(`User validation failed: ${JSON.stringify(result.issues)}`);
      throw new ValidationError('用户数据验证失败', result.issues);
    }
    this.logger.info('User validation passed');
    return data as CreateUserDto;
  }

  /**
   * 验证创建订单请求
   */
  public validateCreateOrder(data: unknown): CreateOrderDto {
    validateObject(data, CreateOrderDto);
    this.logger.info('Order validation passed');
    return data as CreateOrderDto;
  }

  /**
   * 验证高级 DTO
   */
  public validateAdvanced(data: unknown): AdvancedDto {
    validateObject(data, AdvancedDto);
    this.logger.info('Advanced validation passed');
    return data as AdvancedDto;
  }
}

// ============= 控制器 =============

@Controller('/api/users')
class UserController {
  public constructor(
    @Inject(ValidationService) private readonly validationService: ValidationService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  /**
   * 参数级别验证示例
   */
  @GET('/search')
  public search(
    @Query('email') @Validate(IsOptional(), IsEmail()) email?: string,
    @Query('username') @Validate(IsOptional(), IsUsername()) username?: string,
    @Query('minAge') @Validate(IsOptional(), Transform((v) => Number(v)), IsInt(), Min(0)) minAge?: number,
  ) {
    this.logger.info(`Search users: email=${email}, username=${username}, minAge=${minAge}`);
    return {
      message: 'Search parameters validated',
      params: { email, username, minAge },
    };
  }

  /**
   * 类级别验证示例
   */
  @POST('/')
  public createUser(@Body() body: unknown) {
    const dto = this.validationService.validateCreateUser(body);
    this.logger.info(`Creating user: ${dto.username}`);
    return {
      message: 'User created',
      user: {
        id: crypto.randomUUID(),
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        age: dto.age,
        role: dto.role,
      },
    };
  }
}

@Controller('/api/orders')
class OrderController {
  public constructor(
    @Inject(ValidationService) private readonly validationService: ValidationService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  /**
   * 嵌套对象验证示例
   */
  @POST('/')
  public createOrder(@Body() body: unknown) {
    const dto = this.validationService.validateCreateOrder(body);
    const totalAmount = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    this.logger.info(`Creating order for user ${dto.userId}, items: ${dto.items.length}`);

    return {
      message: 'Order created',
      order: {
        id: crypto.randomUUID(),
        userId: dto.userId,
        shippingAddress: dto.shippingAddress,
        items: dto.items,
        totalAmount,
        note: dto.note,
        createdAt: new Date().toISOString(),
      },
    };
  }
}

@Controller('/api/advanced')
class AdvancedController {
  public constructor(
    @Inject(ValidationService) private readonly validationService: ValidationService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  /**
   * 高级验证示例（条件验证、转换等）
   */
  @POST('/')
  public advancedValidation(@Body() body: unknown) {
    const dto = this.validationService.validateAdvanced(body);
    this.logger.info(`Advanced validation: accountType=${dto.accountType}`);
    return {
      message: 'Advanced validation passed',
      data: dto,
    };
  }
}

@Controller('/api/demo')
class DemoController {
  public constructor(@Inject(LOGGER_TOKEN) private readonly logger: Logger) {}

  /**
   * 自定义验证器示例
   */
  @GET('/custom')
  public customValidation(
    @Query('code') @Validate(StartsWith('PRD-')()) code: string,
    @Query('count') @Validate(Transform((v) => Number(v)), IsEven()) count: number,
  ) {
    return {
      message: 'Custom validation passed',
      code,
      count,
    };
  }

  /**
   * 多重验证示例
   */
  @GET('/multi')
  public multiValidation(
    @Query('tags')
    @Validate(
      Transform((v) => (typeof v === 'string' ? v.split(',') : v)),
      IsArray(),
      ArrayMinSize(1),
      ArrayMaxSize(5),
      ArrayUnique(),
    )
    tags: string[],
  ) {
    return {
      message: 'Multi validation passed',
      tags,
    };
  }
}

// ============= 应用模块 =============

@Module({
  imports: [
    LoggerModule.forRoot({
      logger: { prefix: '[Validation Demo]', level: LogLevel.DEBUG },
      enableRequestLogging: true,
    }),
  ],
  controllers: [UserController, OrderController, AdvancedController, DemoController],
  providers: [ValidationService],
})
class AppModule {}

// ============= 启动应用 =============

const app = new Application();

app.registerModule(AppModule);
await app.listen(3000);

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Validation System Demo Server Started                ║
║                   http://localhost:3000                        ║
╠════════════════════════════════════════════════════════════════╣
║  API 端点:                                                      ║
║                                                                 ║
║  1. 参数级别验证:                                                ║
║     GET /api/users/search?email=test@example.com               ║
║     GET /api/users/search?username=john&minAge=18              ║
║                                                                 ║
║  2. 类级别验证（创建用户）:                                       ║
║     POST /api/users                                             ║
║     Body: {                                                     ║
║       "username": "john_doe",                                   ║
║       "email": "john@example.com",                              ║
║       "password": "password123",                                ║
║       "phone": "13812345678",                                   ║
║       "age": 25,                                                ║
║       "role": "user"                                            ║
║     }                                                           ║
║                                                                 ║
║  3. 嵌套对象验证（创建订单）:                                     ║
║     POST /api/orders                                            ║
║     Body: {                                                     ║
║       "userId": "550e8400-e29b-41d4-a716-446655440000",         ║
║       "shippingAddress": {                                      ║
║         "city": "北京",                                          ║
║         "street": "朝阳区建国路1号"                               ║
║       },                                                        ║
║       "items": [                                                ║
║         { "productId": "P001", "name": "商品A",                  ║
║           "price": 99.9, "quantity": 2 }                        ║
║       ]                                                         ║
║     }                                                           ║
║                                                                 ║
║  4. 高级验证（条件验证、转换）:                                    ║
║     POST /api/advanced                                          ║
║     Body: {                                                     ║
║       "accountType": "premium",                                 ║
║       "creditCard": "4532015112830366",                         ║
║       "email": "  TEST@Example.COM  ",                          ║
║       "percentage": "75",                                       ║
║       "tags": ["tech", "news"]                                  ║
║     }                                                           ║
║                                                                 ║
║  5. 自定义验证器:                                                ║
║     GET /api/demo/custom?code=PRD-001&count=10                 ║
║                                                                 ║
║  6. 多重验证:                                                    ║
║     GET /api/demo/multi?tags=a,b,c                              ║
╚════════════════════════════════════════════════════════════════╝
`);
