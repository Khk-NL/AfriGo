function isPlaceholder(value) {
  return !value || /^(replace-with|change-me|example)/i.test(String(value).trim());
}

function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return [];

  const required = [
    'PUBLIC_BASE_URL', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'WECHAT_APP_ID', 'WECHAT_APP_SECRET', 'OSS_REGION', 'OSS_BUCKET'
  ];
  const errors = required.filter((key) => isPlaceholder(env[key])).map((key) => `${key} 未配置`);
  if (env.PUBLIC_BASE_URL && !String(env.PUBLIC_BASE_URL).startsWith('https://')) {
    errors.push('PUBLIC_BASE_URL 必须使用 HTTPS');
  }
  if (env.DB_NAME && !/^[A-Za-z0-9_]+$/.test(env.DB_NAME)) errors.push('DB_NAME 格式不合法');
  if (env.ALLOW_DEV_AUTH === 'true') errors.push('production 禁止开启 ALLOW_DEV_AUTH');
  if (String(env.AMAP_NAVIGATION_ENABLED).toLowerCase() === 'true' && isPlaceholder(env.AMAP_WEB_SERVICE_KEY)) {
    errors.push('AMAP_WEB_SERVICE_KEY 未配置');
  }

  const credentialMode = env.OSS_CREDENTIAL_MODE || 'ecs_ram_role';
  if (credentialMode === 'ecs_ram_role') {
    if (isPlaceholder(env.ALIBABA_CLOUD_ECS_METADATA)) errors.push('ECS RAM Role 名称未配置');
  } else if (credentialMode === 'environment') {
    if (isPlaceholder(env.OSS_ACCESS_KEY_ID)) errors.push('OSS_ACCESS_KEY_ID 未配置');
    if (isPlaceholder(env.OSS_ACCESS_KEY_SECRET)) errors.push('OSS_ACCESS_KEY_SECRET 未配置');
  } else {
    errors.push('OSS_CREDENTIAL_MODE 仅支持 ecs_ram_role 或 environment');
  }
  return errors;
}

function assertProductionConfig(env = process.env) {
  const errors = validateProductionConfig(env);
  if (errors.length) throw new Error(`生产配置校验失败：${errors.join('；')}`);
}

module.exports = { isPlaceholder, validateProductionConfig, assertProductionConfig };
