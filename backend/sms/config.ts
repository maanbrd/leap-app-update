import { secret } from "encore.dev/config";

const smsApiToken = secret("SMSAPI_TOKEN");
const smsApiSender = secret("SMSAPI_SENDER");

export { smsApiToken, smsApiSender };