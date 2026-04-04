import { proxyToAdminMotor } from '../../_lib/admin-motor-proxy';

export const onRequestPost = async (context: any) => proxyToAdminMotor(context);
