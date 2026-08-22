import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentMerchant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const merchant = request.merchant;
    return data ? merchant?.[data] : merchant;
  },
);
