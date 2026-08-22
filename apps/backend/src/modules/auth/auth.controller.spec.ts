/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const authServiceMock = {
      login: jest.fn(),
      refreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should call authService.login with dto', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const response = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };

      (authService.login as jest.Mock).mockResolvedValue(response);

      const result = await controller.login(dto);
      expect(result).toEqual(response);
      const loginMock = authService.login as jest.Mock;
      expect(loginMock.mock.calls).toHaveLength(1);
      expect((loginMock.mock.calls[0] as unknown[])[0]).toEqual(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshToken with token', async () => {
      const dto = { refreshToken: 'refresh-token' };
      const response = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(response);

      const result = await controller.refresh(dto);
      expect(result).toEqual(response);
      const refreshMock = authService.refreshToken as jest.Mock;
      expect(refreshMock.mock.calls).toHaveLength(1);
      expect((refreshMock.mock.calls[0] as unknown[])[0]).toEqual(
        'refresh-token',
      );
    });
  });
});
