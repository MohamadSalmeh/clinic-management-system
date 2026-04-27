import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActiveUserData, CURRENT_USER_KEY } from '../../utils';

type RequestWithUser = {
  [CURRENT_USER_KEY]?: ActiveUserData;
};

export const CurrentUser = createParamDecorator(
  (
    data: keyof ActiveUserData | undefined,
    ctx: ExecutionContext,
  ): ActiveUserData | ActiveUserData[keyof ActiveUserData] | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request[CURRENT_USER_KEY];

    if (!data) {
      return user;
    }

    return user?.[data];
  },
);
