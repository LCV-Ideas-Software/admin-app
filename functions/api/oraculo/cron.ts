import { proxyToAdminMotor } from '../_lib/admin-motor-proxy';

export const onRequestGet = async (context: any) => proxyToAdminMotor(context);

export const onRequestPut = async (context: any) => proxyToAdminMotor(context);
