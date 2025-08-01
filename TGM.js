const BOT_TOKEN = 'YOUR_BOT_TOKEN';
const ADMIN_PASSWORD = 'admin_pd'; // 全局管理员密码
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_PATH = '/';
const SHORTLINK_BASE = 'https://yourdomain.com/s/'; // 修改为您的域名

// FILE_GROUP群组配置
const FILE_GROUP_ID = 'YOUR_FILE_GROUP_ID'; // 替换为您的群组ID
const FILE_GROUP_CONFIG = {
  enabled: true, // 是否启用群组存储
  autoForward: true, // 是否自动转发到群组
  addMetadata: true, // 是否添加元数据标记
  maxFileSize: 50 * 1024 * 1024 // 群组文件大小限制 (50MB)
};

// IP记录配置
const IP_LOG_CONFIG = {
  enabled: true, // 是否启用IP记录
  logToGroup: true, // 是否发送到群组
  geoipApi: 'https://api.ip.sb/geoip', // GeoIP API地址
  logInterval: 5 * 60 * 1000, // 同一IP记录间隔 (5分钟)
  excludePaths: ['/s/', '/group-download/', '/download/'], // 排除的路径
  userAgentFilter: ['bot', 'crawler', 'spider'] // 过滤的User-Agent关键词
};

// 离线下载配置
const OFFLINE_DOWNLOAD_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB 最大下载文件大小
  timeout: 300000, // 5分钟超时
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  allowedDomains: [], // 空数组表示允许所有域名，可以添加限制域名如 ['example.com', 'github.com']
  blockedDomains: ['localhost', '127.0.0.1', '0.0.0.0', '::1'] // 阻止的域名
};

// 代理服务配置
const PROXY_SERVICES = {
  OFFICIAL: "官方直接下载",
  SOLT: "solt代理下载",
  FORW: "forw代理下载",
  BUILTIN: "内置代理下载"
};

// 全局配置存储键名
const GLOBAL_CONFIG_KEY = 'global_config';
const DOWNLOAD_TASKS_KEY = 'download_tasks'; // 下载任务存储键名

// 颜色处理函数
function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function darkenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
    (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
    (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
}

// 默认全局配置
const DEFAULT_CONFIG = {
  maxUploadSize: 5, // MB
  themeColor: '#2563eb',
  darkMode: false,
  bgImage: 'https://www.dmoe.cc/random.php'
};

function generateProxiedUrls(originalUrl, fileName) {
  const proxyBase = 'https://media.solt.dpdns.org';
  const builtinUrl = `${proxyBase}/proxy?url=${encodeURIComponent(originalUrl)}&filename=${encodeURIComponent(fileName)}`;
  
  return {
    [PROXY_SERVICES.OFFICIAL]: originalUrl,
    [PROXY_SERVICES.SOLT]: `https://solt.dpdns.org/${encodeURIComponent(originalUrl)}`,
    [PROXY_SERVICES.FORW]: `https://forw1.hssz202207.eu.org/${encodeURIComponent(originalUrl)}`,
    [PROXY_SERVICES.BUILTIN]: builtinUrl
  };
}

// 强制HTTPS中间件
function enforceHTTPS(request) {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto !== 'https') {
    const url = new URL(request.url);
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return null;
}

// 生成安全的随机ID
function generateFileId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成短链接ID
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 获取客户端真实IP地址
function getClientIP(request) {
  // 按优先级检查各种IP头
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Forwarded-For', // 通用代理
    'X-Real-IP', // Nginx
    'X-Client-IP', // Apache
    'X-Forwarded', // 其他代理
    'Forwarded-For', // 标准
    'Forwarded' // 标准
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // 如果是逗号分隔的多个IP，取第一个
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  // 如果没有找到代理头，尝试获取连接IP
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP;
  }
  
  // 最后尝试从连接信息获取
  return null;
}

// 验证IP地址格式
function isValidIP(ip) {
  if (!ip) return false;
  
  // IPv4验证
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) return true;
  
  // IPv6验证（简化版）
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) return true;
  
  return false;
}

// 用户认证管理
class AuthManager {
  constructor(env) {
    this.kv = env.USERSDATA;
  }

  async getGlobalConfig() {
    const config = await this.kv.get(GLOBAL_CONFIG_KEY, { type: 'json' });
    return config || DEFAULT_CONFIG;
  }

  async updateGlobalConfig(config) {
    await this.kv.put(GLOBAL_CONFIG_KEY, JSON.stringify(config));
  }

  async getUser(userId) {
    return await this.kv.get(`user:${userId}`);
  }

  async setPassword(userId, password) {
    await this.kv.put(`user:${userId}`, password);
  }

  async validateUser(userId, password) {
    if (userId === 'admin' && password === ADMIN_PASSWORD) return true;
    
    const storedPassword = await this.getUser(userId);
    return storedPassword === password;
  }

  async getFiles(userId) {
    const files = await this.kv.get(`files:${userId}`, { type: 'json' });
    return files || [];
  }

  async saveFile(userId, fileName, fileContent, fileType) {
    const fileId = generateFileId();
    const shortId = generateShortId();
    const files = await this.getFiles(userId);
    
    files.push({
      id: fileId,
      shortId,
      name: fileName,
      type: fileType,
      size: fileContent.byteLength,
      uploaded: new Date().toISOString()
    });

    await this.kv.put(`files:${userId}`, JSON.stringify(files));
    await this.kv.put(`file:${userId}:${fileId}`, fileContent);
    await this.kv.put(`short:${shortId}`, JSON.stringify({ userId, fileId }));
    
    // 自动转发到群组
    if (FILE_GROUP_CONFIG.enabled && FILE_GROUP_CONFIG.autoForward) {
      this.forwardFileToGroup(fileId, userId, fileName, fileType);
    }
    
    return { fileId, shortId };
  }

  async getFile(userId, fileId) {
    return await this.kv.get(`file:${userId}:${fileId}`, 'arrayBuffer');
  }

  async deleteFile(userId, fileId) {
    const files = await this.getFiles(userId);
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) return;
    
    const file = files[fileIndex];
    files.splice(fileIndex, 1);
    
    await this.kv.put(`files:${userId}`, JSON.stringify(files));
    await this.kv.delete(`file:${userId}:${fileId}`);
    await this.kv.delete(`short:${file.shortId}`);
  }

  async deleteAllFiles(userId) {
    const files = await this.getFiles(userId);
    
    for (const file of files) {
      await this.kv.delete(`file:${userId}:${file.id}`);
      await this.kv.delete(`short:${file.shortId}`);
    }
    
    await this.kv.delete(`files:${userId}`);
  }

  async getFileByShortId(shortId) {
    const data = await this.kv.get(`short:${shortId}`, { type: 'json' });
    if (!data) return null;
    
    const fileContent = await this.kv.get(`file:${data.userId}:${data.fileId}`, 'arrayBuffer');
    const files = await this.getFiles(data.userId);
    const fileInfo = files.find(f => f.id === data.fileId);
    
    return { ...fileInfo, content: fileContent };
  }

  // 离线下载相关方法
  async getDownloadTasks(userId) {
    const tasks = await this.kv.get(`download_tasks:${userId}`, { type: 'json' });
    return tasks || [];
  }

  async saveDownloadTask(userId, task) {
    const tasks = await this.getDownloadTasks(userId);
    tasks.push(task);
    await this.kv.put(`download_tasks:${userId}`, JSON.stringify(tasks));
  }

  async updateDownloadTask(userId, taskId, updates) {
    const tasks = await this.getDownloadTasks(userId);
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await this.kv.put(`download_tasks:${userId}`, JSON.stringify(tasks));
    }
  }

  async deleteDownloadTask(userId, taskId) {
    const tasks = await this.getDownloadTasks(userId);
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    await this.kv.put(`download_tasks:${userId}`, JSON.stringify(filteredTasks));
  }

  async getDownloadTask(userId, taskId) {
    const tasks = await this.getDownloadTasks(userId);
    return tasks.find(task => task.id === taskId);
  }

  // 群组文件管理方法
  async saveFileToGroup(userId, fileName, fileContent, fileType, originalFileId = null) {
    if (!FILE_GROUP_CONFIG.enabled) {
      return null;
    }

    try {
      // 生成UUID
      const uuid = generateFileId();
      
      // 创建元数据
      const metadata = {
        uuid: uuid,
        userId: userId,
        fileName: fileName,
        fileType: fileType,
        fileSize: fileContent.byteLength,
        uploaded: new Date().toISOString(),
        originalFileId: originalFileId
      };

      // 保存文件到群组存储
      await this.kv.put(`group_file:${uuid}`, fileContent);
      await this.kv.put(`group_metadata:${uuid}`, JSON.stringify(metadata));
      
      // 添加到用户的群组文件列表
      const userGroupFiles = await this.getUserGroupFiles(userId);
      userGroupFiles.push({
        uuid: uuid,
        fileName: fileName,
        fileType: fileType,
        fileSize: fileContent.byteLength,
        uploaded: new Date().toISOString()
      });
      await this.kv.put(`user_group_files:${userId}`, JSON.stringify(userGroupFiles));

      return { uuid, metadata };
    } catch (error) {
      console.error('保存文件到群组失败:', error);
      return null;
    }
  }

  async getUserGroupFiles(userId) {
    const files = await this.kv.get(`user_group_files:${userId}`, { type: 'json' });
    return files || [];
  }

  async getGroupFileByUuid(uuid) {
    const metadata = await this.kv.get(`group_metadata:${uuid}`, { type: 'json' });
    if (!metadata) return null;

    const fileContent = await this.kv.get(`group_file:${uuid}`, 'arrayBuffer');
    if (!fileContent) return null;

    return { ...metadata, content: fileContent };
  }

  async deleteGroupFile(uuid) {
    await this.kv.delete(`group_file:${uuid}`);
    await this.kv.delete(`group_metadata:${uuid}`);
  }

  async forwardFileToGroup(fileId, userId, fileName, fileType) {
    if (!FILE_GROUP_CONFIG.autoForward) {
      return null;
    }

    try {
      // 获取文件内容
      const fileContent = await this.getFile(userId, fileId);
      if (!fileContent) return null;

      // 保存到群组
      const result = await this.saveFileToGroup(userId, fileName, fileContent, fileType, fileId);
      
      if (result && FILE_GROUP_CONFIG.addMetadata) {
        // 发送到Telegram群组
        const caption = `📁 文件: ${fileName}\n👤 用户: ${userId}\n🆔 UUID: ${result.uuid}\n📊 大小: ${Math.round(fileContent.byteLength / 1024)}KB\n⏰ 时间: ${new Date().toLocaleString()}`;
        
        await this.sendFileToGroup(fileContent, fileName, caption);
      }

      return result;
    } catch (error) {
      console.error('转发文件到群组失败:', error);
      return null;
    }
  }

  async sendFileToGroup(fileContent, fileName, caption) {
    try {
      // 创建FormData
      const formData = new FormData();
      const blob = new Blob([fileContent]);
      formData.append('document', blob, fileName);
      formData.append('chat_id', FILE_GROUP_ID);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      // 发送到Telegram
      const response = await fetch(`${TELEGRAM_API}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      return result.ok ? result.result : null;
    } catch (error) {
      console.error('发送文件到群组失败:', error);
      return null;
    }
  }

  // 基于Token的认证方法
  async generateAuthToken(userId, password) {
    // 验证用户
    if (!await this.validateUser(userId, password)) {
      return null;
    }

    // 生成随机token
    const token = generateFileId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时过期

    // 保存token信息
    const tokenData = {
      userId: userId,
      token: token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };

    await this.kv.put(`auth_token:${token}`, JSON.stringify(tokenData));
    await this.kv.put(`user_tokens:${userId}`, JSON.stringify([token]));

    return token;
  }

  async validateAuthToken(token) {
    try {
      const tokenData = await this.kv.get(`auth_token:${token}`, { type: 'json' });
      
      if (!tokenData) {
        return null;
      }

      // 检查是否过期
      if (new Date(tokenData.expiresAt) < new Date()) {
        await this.revokeAuthToken(token);
        return null;
      }

      return tokenData.userId;
    } catch (error) {
      console.error('验证token失败:', error);
      return null;
    }
  }

  async revokeAuthToken(token) {
    try {
      const tokenData = await this.kv.get(`auth_token:${token}`, { type: 'json' });
      if (tokenData) {
        await this.kv.delete(`auth_token:${token}`);
        
        // 从用户token列表中移除
        const userTokens = await this.kv.get(`user_tokens:${tokenData.userId}`, { type: 'json' }) || [];
        const updatedTokens = userTokens.filter(t => t !== token);
        await this.kv.put(`user_tokens:${tokenData.userId}`, JSON.stringify(updatedTokens));
      }
    } catch (error) {
      console.error('撤销token失败:', error);
    }
  }

  async revokeAllUserTokens(userId) {
    try {
      const userTokens = await this.kv.get(`user_tokens:${userId}`, { type: 'json' }) || [];
      
      for (const token of userTokens) {
        await this.kv.delete(`auth_token:${token}`);
      }
      
      await this.kv.delete(`user_tokens:${userId}`);
    } catch (error) {
      console.error('撤销用户所有token失败:', error);
    }
  }

  // IP记录相关方法
  async shouldLogIP(ip, path) {
    if (!IP_LOG_CONFIG.enabled) return false;
    
    // 检查是否在排除路径中
    if (IP_LOG_CONFIG.excludePaths.some(excludePath => path.startsWith(excludePath))) {
      return false;
    }
    
    // 检查记录间隔
    const lastLogTime = await this.kv.get(`ip_log:${ip}`);
    if (lastLogTime) {
      const lastTime = parseInt(lastLogTime);
      if (Date.now() - lastTime < IP_LOG_CONFIG.logInterval) {
        return false;
      }
    }
    
    return true;
  }

  async logIPVisit(ip, userAgent, path, env) {
    try {
      // 更新最后记录时间
      await this.kv.put(`ip_log:${ip}`, Date.now().toString());
      
      // 获取GeoIP信息
      const geoipInfo = await this.getGeoIPInfo(ip);
      
      // 检查是否为机器人
      const isBot = this.isBotUserAgent(userAgent);
      
      // 构建消息
      const message = this.buildIPLogMessage(ip, userAgent, path, geoipInfo, isBot);
      
      // 发送到群组
      if (IP_LOG_CONFIG.logToGroup && FILE_GROUP_CONFIG.enabled) {
        await this.sendIPLogToGroup(message, env);
      }
      
      // 保存到KV存储
      await this.saveIPLog(ip, userAgent, path, geoipInfo, isBot);
      
    } catch (error) {
      console.error('记录IP访问失败:', error);
    }
  }

  async getGeoIPInfo(ip) {
    try {
      const response = await fetch(`${IP_LOG_CONFIG.geoipApi}/${ip}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IPLogger/1.0)'
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('GeoIP API请求失败:', response.status);
        return null;
      }
    } catch (error) {
      console.error('获取GeoIP信息失败:', error);
      return null;
    }
  }

  isBotUserAgent(userAgent) {
    if (!userAgent) return false;
    
    const lowerUA = userAgent.toLowerCase();
    return IP_LOG_CONFIG.userAgentFilter.some(keyword => 
      lowerUA.includes(keyword.toLowerCase())
    );
  }

  buildIPLogMessage(ip, userAgent, path, geoipInfo, isBot) {
    const timestamp = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    let message = `🌐 新访客记录\n\n`;
    message += `⏰ 时间: ${timestamp}\n`;
    message += `🔗 路径: ${path}\n`;
    message += `📱 设备: ${isBot ? '🤖 机器人' : '👤 用户'}\n`;
    
    if (userAgent) {
      const shortUA = userAgent.length > 100 ? userAgent.substring(0, 100) + '...' : userAgent;
      message += `🔍 UA: ${shortUA}\n`;
    }
    
    if (geoipInfo) {
      message += `\n📍 地理位置信息:\n`;
      message += `🌍 国家: ${geoipInfo.country} (${geoipInfo.country_code})\n`;
      message += `🏙️ 城市: ${geoipInfo.city}\n`;
      message += `🏛️ 地区: ${geoipInfo.region} (${geoipInfo.region_code})\n`;
      message += `🌐 ISP: ${geoipInfo.isp}\n`;
      message += `🏢 组织: ${geoipInfo.organization}\n`;
      message += `📡 ASN: ${geoipInfo.asn} (${geoipInfo.asn_organization})\n`;
      message += `🌍 大洲: ${geoipInfo.continent_code}\n`;
      message += `📍 坐标: ${geoipInfo.latitude}, ${geoipInfo.longitude}\n`;
      message += `⏰ 时区: ${geoipInfo.timezone} (UTC${geoipInfo.offset >= 0 ? '+' : ''}${geoipInfo.offset / 3600})\n`;
    } else {
      message += `\n❌ 无法获取地理位置信息\n`;
    }
    
    return message;
  }

  async sendIPLogToGroup(message, env) {
    try {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: FILE_GROUP_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (error) {
      console.error('发送IP记录到群组失败:', error);
    }
  }

  async saveIPLog(ip, userAgent, path, geoipInfo, isBot) {
    try {
      const logEntry = {
        ip: ip,
        userAgent: userAgent,
        path: path,
        geoipInfo: geoipInfo,
        isBot: isBot,
        timestamp: new Date().toISOString()
      };
      
      // 保存到KV存储
      const logId = generateFileId();
      await this.kv.put(`ip_log_entry:${logId}`, JSON.stringify(logEntry));
      
      // 添加到IP日志列表
      const ipLogs = await this.kv.get('ip_logs', { type: 'json' }) || [];
      ipLogs.unshift(logEntry);
      
      // 只保留最近1000条记录
      if (ipLogs.length > 1000) {
        ipLogs.splice(1000);
      }
      
      await this.kv.put('ip_logs', JSON.stringify(ipLogs));
      
    } catch (error) {
      console.error('保存IP日志失败:', error);
    }
  }

  async getIPLogs(limit = 50) {
    try {
      const ipLogs = await this.kv.get('ip_logs', { type: 'json' }) || [];
      return ipLogs.slice(0, limit);
    } catch (error) {
      console.error('获取IP日志失败:', error);
      return [];
    }
  }
}

async function handleMediaFile(fileId, chatId, fileName = 'file') {
  const getFileUrl = `${TELEGRAM_API}/getFile?file_id=${fileId}`;
  const getFileRes = await fetch(getFileUrl);
  const fileData = await getFileRes.json();
  
  if (!fileData.ok) {
    await sendMessage(chatId, '❌ 无法获取文件信息');
    return;
  }

  const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
  const proxiedUrls = generateProxiedUrls(downloadUrl, fileName);

  // 创建下载按钮
  const keyboard = {
    inline_keyboard: Object.entries(proxiedUrls).map(([service, url]) => [
      { 
        text: service,
        url: url
      }
    ])
  };

  await sendMessageWithButtons(
    chatId,
    `⬇️ 请选择下载方式 (文件大小: ${Math.round((fileData.result.file_size || 0)/1024)}KB)：`,
    keyboard
  );
}

// 离线下载相关函数
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isAllowedDomain(url) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();
  
  // 检查是否在阻止列表中
  if (OFFLINE_DOWNLOAD_CONFIG.blockedDomains.includes(hostname)) {
    return false;
  }
  
  // 如果允许列表为空，则允许所有域名
  if (OFFLINE_DOWNLOAD_CONFIG.allowedDomains.length === 0) {
    return true;
  }
  
  // 检查是否在允许列表中
  return OFFLINE_DOWNLOAD_CONFIG.allowedDomains.some(domain => 
    hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase())
  );
}

function extractFileNameFromUrl(url, contentType) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop();
    
    if (fileName && fileName.includes('.')) {
      return fileName;
    }
    
    // 根据Content-Type推断文件名
    if (contentType) {
      const ext = contentType.split('/')[1]?.split(';')[0];
      if (ext) {
        return `downloaded_file.${ext}`;
      }
    }
    
    return 'downloaded_file';
  } catch {
    return 'downloaded_file';
  }
}

async function startOfflineDownload(url, userId, chatId, env) {
  const auth = new AuthManager(env);
  
  // 验证URL
  if (!isValidUrl(url)) {
    await sendMessage(chatId, '❌ 无效的URL格式');
    return;
  }
  
  if (!isAllowedDomain(url)) {
    await sendMessage(chatId, '❌ 该域名不在允许列表中');
    return;
  }
  
  // 创建下载任务
  const taskId = generateFileId();
  const task = {
    id: taskId,
    url: url,
    status: 'pending', // pending, downloading, completed, failed
    createdAt: new Date().toISOString(),
    userId: userId,
    chatId: chatId
  };
  
  await auth.saveDownloadTask(userId, task);
  
  // 发送开始下载消息（如果有chatId）
  if (chatId) {
    await sendMessage(chatId, `⏳ 开始离线下载任务\n\n🔗 URL: ${url}\n📋 任务ID: ${taskId}\n\n正在下载中，请稍候...`);
  }
  
  // 异步执行下载
  downloadFileAsync(url, userId, taskId, env);
}

async function downloadFileAsync(url, userId, taskId, env) {
  const auth = new AuthManager(env);
  
  try {
    // 更新任务状态为下载中
    await auth.updateDownloadTask(userId, taskId, { 
      status: 'downloading',
      startedAt: new Date().toISOString()
    });
    
    // 开始下载
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OFFLINE_DOWNLOAD_CONFIG.timeout);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': OFFLINE_DOWNLOAD_CONFIG.userAgent
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // 检查文件大小
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > OFFLINE_DOWNLOAD_CONFIG.maxFileSize) {
      throw new Error(`文件过大: ${Math.round(parseInt(contentLength) / 1024 / 1024)}MB (最大限制: ${Math.round(OFFLINE_DOWNLOAD_CONFIG.maxFileSize / 1024 / 1024)}MB)`);
    }
    
    // 获取文件内容
    const fileContent = await response.arrayBuffer();
    
    // 检查实际文件大小
    if (fileContent.byteLength > OFFLINE_DOWNLOAD_CONFIG.maxFileSize) {
      throw new Error(`文件过大: ${Math.round(fileContent.byteLength / 1024 / 1024)}MB (最大限制: ${Math.round(OFFLINE_DOWNLOAD_CONFIG.maxFileSize / 1024 / 1024)}MB)`);
    }
    
    // 获取文件名和类型
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileName = extractFileNameFromUrl(url, contentType);
    
    // 保存文件
    const { fileId, shortId } = await auth.saveFile(userId, fileName, fileContent, contentType);
    
    // 更新任务状态为完成
    await auth.updateDownloadTask(userId, taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      fileId: fileId,
      shortId: shortId,
      fileName: fileName,
      fileSize: fileContent.byteLength
    });
    
    // 发送完成消息（如果有chatId）
    const task = await auth.getDownloadTask(userId, taskId);
    const chatId = task.chatId;
    
    if (chatId) {
      const fileSize = Math.round(fileContent.byteLength / 1024) > 1024 
        ? (fileContent.byteLength / (1024 * 1024)).toFixed(1) + 'MB' 
        : Math.round(fileContent.byteLength / 1024) + 'KB';
      
      const message = `✅ 离线下载完成！\n\n📁 文件名: ${fileName}\n📊 文件大小: ${fileSize}\n🔗 原始URL: ${url}\n\n📥 下载链接:\n${SHORTLINK_BASE}${shortId}`;
      
      await sendMessage(chatId, message);
    }
    
  } catch (error) {
    console.error('Download error:', error);
    
    // 更新任务状态为失败
    await auth.updateDownloadTask(userId, taskId, {
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: error.message
    });
    
    // 发送失败消息（如果有chatId）
    const task = await auth.getDownloadTask(userId, taskId);
    const chatId = task.chatId;
    
    if (chatId) {
      await sendMessage(chatId, `❌ 离线下载失败\n\n🔗 URL: ${url}\n📋 任务ID: ${taskId}\n❌ 错误: ${error.message}`);
    }
  }
}

async function getDownloadTasksList(userId, chatId, env) {
  const auth = new AuthManager(env);
  const tasks = await auth.getDownloadTasks(userId);
  
  if (tasks.length === 0) {
    await sendMessage(chatId, '📋 暂无下载任务');
    return;
  }
  
  const taskList = tasks.slice(-10).reverse().map(task => {
    const status = {
      'pending': '⏳ 等待中',
      'downloading': '⬇️ 下载中',
      'completed': '✅ 已完成',
      'failed': '❌ 失败'
    }[task.status] || '❓ 未知';
    
    const fileSize = task.fileSize ? 
      (Math.round(task.fileSize / 1024) > 1024 
        ? (task.fileSize / (1024 * 1024)).toFixed(1) + 'MB' 
        : Math.round(task.fileSize / 1024) + 'KB') : '';
    
    const shortLink = task.shortId ? `${SHORTLINK_BASE}${task.shortId}` : '';
    
    return `📋 任务ID: ${task.id}\n${status}\n🔗 ${task.url}\n📁 ${task.fileName || '未知'}\n📊 ${fileSize}\n🔗 ${shortLink}\n⏰ ${new Date(task.createdAt).toLocaleString()}\n`;
  }).join('\n');
  
  await sendMessage(chatId, `📋 最近10个下载任务:\n\n${taskList}`);
}

async function handleGroupFileDownload(uuid, chatId, env, requestUrl = null) {
  const auth = new AuthManager(env);
  
  try {
    const fileData = await auth.getGroupFileByUuid(uuid);
    
    if (!fileData) {
      await sendMessage(chatId, '❌ 未找到该UUID对应的文件');
      return;
    }
    
    // 创建下载链接
    const baseUrl = requestUrl ? new URL(requestUrl).origin : 'https://yourdomain.com';
    const downloadUrl = `${baseUrl}/group-download/${uuid}`;
    const proxiedUrls = generateProxiedUrls(downloadUrl, fileData.fileName);
    
    // 创建下载按钮
    const keyboard = {
      inline_keyboard: Object.entries(proxiedUrls).map(([service, url]) => [
        { 
          text: service,
          url: url
        }
      ])
    };
    
    const fileSize = Math.round(fileData.fileSize / 1024) > 1024 
      ? (fileData.fileSize / (1024 * 1024)).toFixed(1) + 'MB' 
      : Math.round(fileData.fileSize / 1024) + 'KB';
    
    await sendMessageWithButtons(
      chatId,
      `📁 群组文件下载\n\n📋 文件名: ${fileData.fileName}\n📊 文件大小: ${fileSize}\n👤 上传用户: ${fileData.userId}\n🆔 UUID: ${uuid}\n⏰ 上传时间: ${new Date(fileData.uploaded).toLocaleString()}\n\n请选择下载方式：`,
      keyboard
    );
    
  } catch (error) {
    console.error('群组文件下载错误:', error);
    await sendMessage(chatId, '❌ 获取文件信息失败');
  }
}

// 认证中间件函数
async function authenticateRequest(request, env) {
  const auth = new AuthManager(env);
  
  // 从cookie获取token
  const cookies = request.headers.get('cookie') || '';
  const tokenMatch = cookies.match(/auth_token=([^;]+)/);
  
  if (!tokenMatch) {
    return { success: false, message: '未授权' };
  }
  
  const token = tokenMatch[1];
  const userId = await auth.validateAuthToken(token);
  
  if (!userId) {
    return { success: false, message: 'token无效或已过期' };
  }
  
  return { success: true, userId, auth };
}

async function sendMessage(chatId, text) {
  // 检查chatId是否有效
  if (!chatId) {
    console.warn('sendMessage: chatId is null or undefined');
    return;
  }
  
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  };
  
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('sendMessage failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('sendMessage error:', error);
  }
}

async function sendMessageWithButtons(chatId, text, replyMarkup) {
  // 检查chatId是否有效
  if (!chatId) {
    console.warn('sendMessageWithButtons: chatId is null or undefined');
    return;
  }
  
  const payload = {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    parse_mode: 'HTML'
  };
  
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('sendMessageWithButtons failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('sendMessageWithButtons error:', error);
  }
}

async function setWebhook(request) {
  const url = new URL(request.url);
  url.pathname = WEBHOOK_PATH;
  url.search = '';
  
  const webhookUrl = url.toString();
  const setWebhookUrl = `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`;
  
  const response = await fetch(setWebhookUrl);
  const result = await response.json();
  
  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleWebhookUpdate(request, env) {
  const update = await request.json();
  const auth = new AuthManager(env);
  
  if (update.message && update.message.chat.type === 'private') {
    const message = update.message;
    const userId = message.from.id.toString();
    
    // 处理密码设置命令
    if (message.text && message.text.startsWith('/passwd')) {
      const password = message.text.split(' ')[1];
      if (password) {
        await auth.setPassword(userId, password);
        await sendMessage(
          message.chat.id,
          '✅ 密码设置成功！\n\n' +
          '您现在可以通过以下链接访问您的网盘：\n' +
          `${new URL(request.url).origin}/?user=${userId}\n\n` +
          '用户名：您的Telegram ID\n' +
          `密码：${password}`
        );
      } else {
        await sendMessage(
          message.chat.id,
          '❌ 密码格式错误\n\n' +
          '请使用格式：<code>/passwd 您的新密码</code>\n' +
          '例如：<code>/passwd mySecurePassword123</code>'
        );
      }
      return new Response('OK', { status: 200 });
    }
    
    // 处理离线下载任务列表命令
    if (message.text && message.text === '/tasks') {
      await getDownloadTasksList(userId, message.chat.id, env);
      return new Response('OK', { status: 200 });
    }
    
    // 处理/dl命令 - 通过UUID下载群组文件
    if (message.text && message.text.startsWith('/dl ')) {
      const uuid = message.text.split(' ')[1];
      if (uuid) {
        await handleGroupFileDownload(uuid, message.chat.id, env, request.url);
      } else {
        await sendMessage(message.chat.id, '❌ 请提供有效的UUID\n\n格式: <code>/dl UUID</code>');
      }
      return new Response('OK', { status: 200 });
    }
    
    // 处理离线下载链接
    if (message.text && isValidUrl(message.text)) {
      await startOfflineDownload(message.text, userId, message.chat.id, env);
      return new Response('OK', { status: 200 });
    }
    
    // 检查用户是否设置密码
    const userExists = await auth.getUser(userId);
    if (!userExists && message.text && !message.text.startsWith('/')) {
      await sendMessage(
        message.chat.id,
        '🔐 您尚未设置密码\n\n' +
        '请使用命令设置密码以激活网盘功能：\n' +
        '<code>/passwd 您的密码</code>\n\n' +
        '设置后您将获得网页版网盘访问权限'
      );
      return new Response('OK', { status: 200 });
    }
    
    // 处理媒体文件
    let fileName = 'file';
    if (message.document) fileName = message.document.file_name;
    if (message.photo) fileName = 'photo.jpg';
    if (message.video) fileName = message.video.file_name || 'video.mp4';
    
    if (message.sticker) {
      await handleMediaFile(message.sticker.file_id, message.chat.id, 'sticker.webp');
    }
    else if (message.photo && message.photo.length) {
      const bestQuality = message.photo.reduce((prev, current) => 
        (prev.file_size > current.file_size) ? prev : current
      );
      await handleMediaFile(bestQuality.file_id, message.chat.id, 'photo.jpg');
    }
    else if (message.document) {
      await handleMediaFile(message.document.file_id, message.chat.id, message.document.file_name);
    }
    else if (message.video) {
      await handleMediaFile(message.video.file_id, message.chat.id, message.video.file_name || 'video.mp4');
    }
    else if (message.voice) {
      await handleMediaFile(message.voice.file_id, message.chat.id, 'voice.ogg');
    }
    else if (message.audio) {
      await handleMediaFile(message.audio.file_id, message.chat.id, message.audio.file_name || 'audio.mp3');
    }
    else if (message.text) {
      await sendMessage(
        message.chat.id,
        '🖼️ 请发送媒体文件获取下载链接\n' +
        '📎 支持类型: 图片/贴纸/文件/视频/语音\n\n' +
        '🌐 离线下载功能已启用！\n' +
        '📥 直接发送文件链接即可开始离线下载\n' +
        '📋 发送 <code>/tasks</code> 查看下载任务列表\n\n' +
        '📁 群组文件下载功能已启用！\n' +
        '🔗 发送 <code>/dl UUID</code> 下载群组文件\n\n' +
        '💾 网页版网盘功能已启用！\n' +
        '🔗 <a href="/">访问网页版网盘</a>\n' +
        '🔧 <a href="/webhookset">设置Webhook</a>'
      );
    }
  }
  
  return new Response('OK', { status: 200 });
}

// 获取文件图标
function getFileIcon(type) {
  if (!type) return '📁';
  
  if (type.startsWith('text/') || type === 'application/json') return '📄';
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('audio/')) return '🎵';
  if (type.startsWith('video/')) return '🎬';
  if (type === 'application/pdf') return '📃';
  if (type === 'application/zip' || type === 'application/x-rar-compressed') return '📦';
  if (type === 'application/javascript' || type === 'text/css') return '💻';
  
  return '📁';
}

// 渲染网盘界面
async function renderDashboard(request, env, userId, config) {
  const auth = new AuthManager(env);
  const files = await auth.getFiles(userId);
  
  const fileList = files.map(file => {
    const fileSize = Math.round(file.size/1024) > 1024 
      ? (file.size/(1024*1024)).toFixed(1) + 'MB' 
      : Math.round(file.size/1024) + 'KB';
      
    return `
      <div class="file-item">
        <div class="file-info">
          <span class="file-icon">${getFileIcon(file.type)}</span>
          <span class="file-name">${file.name}</span>
          <span class="file-size">${fileSize}</span>
          <span class="file-date">${new Date(file.uploaded).toLocaleDateString()}</span>
        </div>
        <div class="file-actions">
          <a href="/download/${userId}/${file.id}" class="btn btn-download">下载</a>
          <a href="${SHORTLINK_BASE}${file.shortId}" target="_blank" class="btn btn-shortlink">短链</a>
          <button class="btn btn-preview" data-fileid="${file.id}" data-type="${file.type}">预览</button>
          <button class="btn btn-delete" data-fileid="${file.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  const bgImageUrl = config.bgImage || 'https://www.dmoe.cc/random.php';
  
  return `
    <!DOCTYPE html>
    <html lang="zh-CN" data-theme="${config.darkMode ? 'dark' : 'light'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Telegram云盘</title>
      <style>
        :root {
          --primary-color: ${config.themeColor};
          --primary-light: ${lightenColor(config.themeColor, 20)};
          --primary-dark: ${darkenColor(config.themeColor, 20)};
          --bg-color: #f5f7fa;
          --text-color: #333;
          --card-bg: rgba(255, 255, 255, 0.85);
          --border-color: #e1e4e8;
          --shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        
        [data-theme="dark"] {
          --bg-color: #1a1a2e;
          --text-color: #e0e0e0;
          --card-bg: rgba(30, 30, 46, 0.85);
          --border-color: #2d2d44;
          --shadow: 0 4px 6px rgba(0,0,0,0.25);
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: var(--text-color); 
          background: var(--bg-color);
          background-image: url('${bgImageUrl}');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          min-height: 100vh;
        }
        
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 20px;
          position: relative;
          z-index: 2;
        }
        
        .glass-panel {
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 25px;
          box-shadow: var(--shadow);
          border: 1px solid var(--border-color);
        }
        
        header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 20px 0; 
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 20px;
        }
        
        h1 { 
          color: var(--primary-color); 
          font-size: 1.8rem; 
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .user-info { 
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .user-actions {
          display: flex;
          gap: 10px;
        }
        
        .btn { 
          display: inline-block; 
          padding: 8px 16px; 
          background: var(--primary-color); 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: 500; 
          cursor: pointer; 
          border: none;
          transition: all 0.3s;
          font-size: 14px;
        }
        
        .btn:hover { 
          background: var(--primary-dark); 
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .btn-logout { background: #dc2626; }
        .btn-logout:hover { background: #b91c1c; }
        .btn-upload { background: #10b981; }
        .btn-upload:hover { background: #059669; }
        .btn-delete { background: #ef4444; }
        .btn-delete:hover { background: #dc2626; }
        .btn-download { background: #3b82f6; }
        .btn-download:hover { background: #2563eb; }
        .btn-shortlink { background: #8b5cf6; }
        .btn-shortlink:hover { background: #7c3aed; }
        .btn-preview { background: #f59e0b; }
        .btn-preview:hover { background: #d97706; }
        .btn-settings { background: #64748b; }
        .btn-settings:hover { background: #475569; }
        
        .upload-section { 
          margin: 25px 0; 
        }
        
        .upload-area { 
          border: 2px dashed #cbd5e1; 
          border-radius: 8px; 
          padding: 30px; 
          text-align: center; 
          margin: 20px 0; 
          background: rgba(248, 250, 252, 0.5);
          transition: all 0.3s; 
        }
        
        .upload-area:hover { 
          border-color: var(--primary-color); 
          background: rgba(239, 246, 255, 0.7); 
        }
        
        .upload-area.highlight { 
          border-color: var(--primary-color); 
          background: rgba(219, 234, 254, 0.7); 
        }
        
        #file-input { display: none; }
        
        .file-label { 
          display: inline-block; 
          padding: 12px 24px; 
          background: var(--primary-color); 
          color: white; 
          border-radius: 6px; 
          cursor: pointer; 
          font-weight: 500; 
          margin: 15px 0; 
          transition: all 0.3s;
        }
        
        .file-label:hover { 
          background: var(--primary-dark); 
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .files-section { margin-top: 30px; }
        
        .file-list {
          border-radius: 10px;
          overflow: hidden;
        }
        
        .file-list-header { 
          display: flex; 
          background: rgba(241, 245, 249, 0.5);
          padding: 12px 20px; 
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }
        
        .file-col-name { flex: 3; }
        .file-col-size { flex: 1; min-width: 100px; }
        .file-col-date { flex: 2; min-width: 120px; }
        .file-col-actions { flex: 3; min-width: 200px; text-align: right; }
        
        .file-item { 
          display: flex; 
          padding: 15px 20px; 
          border-bottom: 1px solid var(--border-color); 
          align-items: center;
          transition: background 0.3s;
        }
        
        .file-item:hover { 
          background: rgba(248, 250, 252, 0.5);
        }
        
        .file-info { 
          flex: 6; 
          display: flex; 
          align-items: center;
          gap: 12px;
        }
        
        .file-icon {
          font-size: 1.5rem;
          width: 32px;
          text-align: center;
        }
        
        .file-name { 
          flex: 3; 
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-size { 
          flex: 1; 
          min-width: 100px; 
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .file-date { 
          flex: 2; 
          min-width: 120px; 
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .file-actions { 
          flex: 3; 
          min-width: 200px; 
          text-align: right;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .file-actions .btn { 
          padding: 6px 12px; 
          font-size: 0.85rem; 
        }
        
        .notice { 
          background: rgba(255, 251, 235, 0.7);
          border-left: 4px solid #f59e0b; 
          padding: 15px; 
          margin: 20px 0; 
          border-radius: 0 8px 8px 0; 
        }
        
        .notice p { margin: 5px 0; }
        
        .empty-state { 
          text-align: center; 
          padding: 40px 20px; 
          color: #64748b; 
        }
        
        .empty-state p { margin-top: 10px; }
        
        footer { 
          text-align: center; 
          padding: 25px 0; 
          margin-top: 40px; 
          color: #64748b; 
          font-size: 0.9rem; 
          border-top: 1px solid var(--border-color);
        }
        
        footer a { 
          color: var(--primary-color); 
          text-decoration: none; 
        }
        
        footer a:hover { text-decoration: underline; }
        
        /* 预览模态框 */
        .preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
        }
        
        .preview-modal.active {
          opacity: 1;
          visibility: visible;
        }
        
        .preview-content {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 25px;
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
          position: relative;
          width: 800px;
        }
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .preview-body {
          max-height: 70vh;
          overflow: auto;
        }
        
        .preview-iframe {
          width: 100%;
          height: 500px;
          border: none;
          border-radius: 8px;
        }
        
        .preview-image {
          max-width: 100%;
          max-height: 70vh;
          display: block;
          margin: 0 auto;
          border-radius: 8px;
        }
        
        .preview-audio, .preview-video {
          width: 100%;
          border-radius: 8px;
        }
        
        .close-btn {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* 设置面板 */
        .settings-panel {
          margin-top: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .form-control {
          width: 100%;
          padding: 10px 15px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          color: var(--text-color);
        }
        
        .color-picker {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .color-option {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
        }
        
        .color-option.active {
          border-color: white;
          box-shadow: 0 0 0 2px var(--primary-color);
        }
        
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .slider {
          background-color: var(--primary-color);
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        /* 文件图标 */
        .file-icon-text::before { content: '📄'; }
        .file-icon-image::before { content: '🖼️'; }
        .file-icon-audio::before { content: '🎵'; }
        .file-icon-video::before { content: '🎬'; }
        .file-icon-archive::before { content: '📦'; }
        .file-icon-pdf::before { content: '📃'; }
        .file-icon-code::before { content: '💻'; }
        .file-icon-default::before { content: '📁'; }
        
        /* 下载任务样式 */
        .download-tasks-header { 
          display: flex; 
          background: rgba(241, 245, 249, 0.5);
          padding: 12px 20px; 
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }
        
        .task-col-status { flex: 1; min-width: 80px; }
        .task-col-url { flex: 3; }
        .task-col-filename { flex: 2; }
        .task-col-size { flex: 1; min-width: 80px; }
        .task-col-date { flex: 2; min-width: 120px; }
        .task-col-actions { flex: 1; min-width: 100px; text-align: right; }
        
        .download-task-item { 
          display: flex; 
          padding: 15px 20px; 
          border-bottom: 1px solid var(--border-color); 
          align-items: center;
          transition: background 0.3s;
        }
        
        .download-task-item:hover { 
          background: rgba(248, 250, 252, 0.5);
        }
        
        .task-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .task-status-pending { background: #fef3c7; color: #92400e; }
        .task-status-downloading { background: #dbeafe; color: #1e40af; }
        .task-status-completed { background: #d1fae5; color: #065f46; }
        .task-status-failed { background: #fee2e2; color: #991b1b; }
        
        .task-url {
          word-break: break-all;
          font-size: 0.9rem;
          color: var(--primary-color);
        }
        
        .task-filename {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .task-size {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .task-date {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .task-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .task-actions .btn { 
          padding: 4px 8px; 
          font-size: 0.8rem; 
        }
        
        /* 离线下载输入框样式 */
        .download-input-area {
          margin: 20px 0;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .input-group .form-control {
          flex: 1;
          margin: 0;
        }
        
        .input-group .btn {
          white-space: nowrap;
        }
        
        @media (max-width: 768px) {
          .input-group {
            flex-direction: column;
            align-items: stretch;
          }
          
          .input-group .btn {
            margin-top: 10px;
          }
        }
        
        /* 群组文件样式 */
        .group-files-header { 
          display: flex; 
          background: rgba(241, 245, 249, 0.5);
          padding: 12px 20px; 
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }
        
        .group-col-filename { flex: 3; }
        .group-col-size { flex: 1; min-width: 80px; }
        .group-col-uuid { flex: 2; min-width: 120px; }
        .group-col-date { flex: 2; min-width: 120px; }
        .group-col-actions { flex: 1; min-width: 100px; text-align: right; }
        
        .group-file-item { 
          display: flex; 
          padding: 15px 20px; 
          border-bottom: 1px solid var(--border-color); 
          align-items: center;
          transition: background 0.3s;
        }
        
        .group-file-item:hover { 
          background: rgba(248, 250, 252, 0.5);
        }
        
        .group-filename {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .group-size {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .group-uuid {
          font-family: monospace;
          font-size: 0.8rem;
          color: var(--primary-color);
          background: rgba(59, 130, 246, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .group-date {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .group-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .group-actions .btn { 
          padding: 4px 8px; 
          font-size: 0.8rem; 
        }
        
        /* IP日志样式 */
        .ip-logs-header { 
          display: flex; 
          background: rgba(241, 245, 249, 0.5);
          padding: 12px 20px; 
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }
        
        .ip-col-time { flex: 2; min-width: 120px; }
        .ip-col-ip { flex: 1; min-width: 100px; }
        .ip-col-location { flex: 2; min-width: 150px; }
        .ip-col-path { flex: 2; min-width: 150px; }
        .ip-col-device { flex: 1; min-width: 80px; }
        
        .ip-log-item { 
          display: flex; 
          padding: 15px 20px; 
          border-bottom: 1px solid var(--border-color); 
          align-items: center;
          transition: background 0.3s;
        }
        
        .ip-log-item:hover { 
          background: rgba(248, 250, 252, 0.5);
        }
        
        .ip-time {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .ip-address {
          font-family: monospace;
          font-size: 0.9rem;
          color: var(--primary-color);
          background: rgba(59, 130, 246, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .ip-location {
          font-size: 0.9rem;
          color: var(--text-color);
        }
        
        .ip-path {
          font-size: 0.9rem;
          color: #64748b;
          word-break: break-all;
        }
        
        .ip-device {
          font-size: 0.9rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .ip-device-bot {
          background: #fef3c7;
          color: #92400e;
        }
        
        .ip-device-user {
          background: #dbeafe;
          color: #1e40af;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header class="glass-panel">
          <h1>📁 Telegram 云存储</h1>
          <div class="user-info">
            <div>用户ID: ${userId}</div>
            <div class="user-actions">
              <button id="settings-btn" class="btn btn-settings">设置</button>
              <button id="logout-btn" class="btn btn-logout">退出</button>
            </div>
          </div>
        </header>
        
        <section class="upload-section glass-panel">
          <h2>上传文件</h2>
          <p class="notice">
            <strong>注意：</strong>单个文件大小限制为${config.maxUploadSize}MB
          </p>
          
          <div class="upload-area" id="upload-area">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>将文件拖放到此区域或</p>
            <label for="file-input" class="file-label">选择文件</label>
            <input type="file" id="file-input">
            <p id="upload-status" style="margin-top: 15px; color: #64748b;">支持上传文档、图片、音频等文件</p>
          </div>
        </section>
        
        <section class="offline-download-section glass-panel" style="margin-top: 25px;">
          <h2>离线下载</h2>
          <p class="notice">
            <strong>说明：</strong>输入文件链接，系统将自动下载并保存到您的网盘
          </p>
          
          <div class="download-input-area">
            <div class="input-group">
              <input type="url" id="download-url" placeholder="请输入文件下载链接 (http:// 或 https://)" class="form-control">
              <button id="start-download-btn" class="btn btn-upload">开始下载</button>
            </div>
            <p id="download-status" style="margin-top: 10px; color: #64748b;">支持各种文件类型，最大100MB</p>
          </div>
        </section>
        
        <section class="files-section">
          <h2>我的文件</h2>
          <div class="file-list glass-panel">
            <div class="file-list-header">
              <div class="file-col-name">文件名</div>
              <div class="file-col-size">大小</div>
              <div class="file-col-date">上传时间</div>
              <div class="file-col-actions">操作</div>
            </div>
            <div id="file-list-container">
              ${files.length ? fileList : `
                <div class="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p>暂无文件，请上传您的第一个文件</p>
                </div>
              `}
            </div>
          </div>
        </section>
        
        <section class="download-tasks-section" style="margin-top: 30px;">
          <h2>离线下载任务</h2>
          <div class="download-tasks-panel glass-panel">
            <div class="download-tasks-header">
              <div class="task-col-status">状态</div>
              <div class="task-col-url">URL</div>
              <div class="task-col-filename">文件名</div>
              <div class="task-col-size">大小</div>
              <div class="task-col-date">创建时间</div>
              <div class="task-col-actions">操作</div>
            </div>
            <div id="download-tasks-container">
              <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>暂无下载任务，在Telegram中发送链接开始离线下载</p>
              </div>
            </div>
          </div>
        </section>
        
        <section class="group-files-section" style="margin-top: 30px;">
          <h2>群组文件</h2>
          <div class="group-files-panel glass-panel">
            <div class="group-files-header">
              <div class="group-col-filename">文件名</div>
              <div class="group-col-size">大小</div>
              <div class="group-col-uuid">UUID</div>
              <div class="group-col-date">上传时间</div>
              <div class="group-col-actions">操作</div>
            </div>
            <div id="group-files-container">
              <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                <p>暂无群组文件</p>
              </div>
            </div>
          </div>
        </section>
        
        ${userId === 'admin' ? `
        <section class="ip-logs-section" style="margin-top: 30px;">
          <h2>访问日志</h2>
          <div class="ip-logs-panel glass-panel">
            <div class="ip-logs-header">
              <div class="ip-col-time">时间</div>
              <div class="ip-col-ip">IP地址</div>
              <div class="ip-col-location">位置</div>
              <div class="ip-col-path">访问路径</div>
              <div class="ip-col-device">设备类型</div>
            </div>
            <div id="ip-logs-container">
              <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p>暂无访问记录</p>
              </div>
            </div>
          </div>
        </section>
        ` : ''}
        
        <div class="preview-modal" id="preview-modal">
          <div class="preview-content">
            <div class="preview-header">
              <h2 id="preview-title">文件预览</h2>
              <button class="close-btn" id="close-preview">&times;</button>
            </div>
            <div class="preview-body" id="preview-body"></div>
          </div>
        </div>
        
        <div class="settings-panel glass-panel" id="settings-panel" style="display: none;">
          <h2>个人设置</h2>
          
          <form id="settings-form">
            ${userId === 'admin' ? `
              <div class="form-group">
                <label>最大上传大小 (MB)</label>
                <input type="number" name="maxUploadSize" class="form-control" value="${config.maxUploadSize}" min="1" max="100">
              </div>
              
              <div class="form-group">
                <label>背景图片 URL</label>
                <input type="text" name="bgImage" class="form-control" value="${config.bgImage || ''}">
              </div>
            ` : ''}
            
            <div class="form-group">
              <label>主题颜色</label>
              <div class="color-picker">
                ${['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'].map(color => `
                  <div class="color-option ${color === config.themeColor ? 'active' : ''}" 
                       style="background: ${color};"
                       data-color="${color}"></div>
                `).join('')}
                <input type="hidden" name="themeColor" value="${config.themeColor}">
              </div>
            </div>
            
            <div class="form-group">
              <label>深色模式</label>
              <div class="theme-toggle">
                <label class="switch">
                  <input type="checkbox" name="darkMode" ${config.darkMode ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
                <span>${config.darkMode ? '开启' : '关闭'}</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>修改密码</label>
              <input type="password" name="newPassword" class="form-control" placeholder="新密码">
              <input type="password" name="confirmPassword" class="form-control" placeholder="确认新密码" style="margin-top: 10px;">
            </div>
            
            <div class="form-group">
              <button type="submit" class="btn">保存设置</button>
              <button type="button" id="delete-all-btn" class="btn btn-delete">删除所有文件</button>
            </div>
          </form>
        </div>
        
        <footer class="glass-panel">
          <p>Telegram Cloud Storage &copy; ${new Date().getFullYear()} | 使用Telegram ID作为用户名</p>
          <p>通过 <a href="#" id="reset-link">/passwd</a> 命令重置密码 | <a href="/">返回首页</a></p>
        </footer>
      </div>
      
      <script>
        // 工具函数
        function getFileIcon(type) {
          if (!type) return '📁';
          
          if (type.startsWith('text/') || type === 'application/json') return '📄';
          if (type.startsWith('image/')) return '🖼️';
          if (type.startsWith('audio/')) return '🎵';
          if (type.startsWith('video/')) return '🎬';
          if (type === 'application/pdf') return '📃';
          if (type === 'application/zip' || type === 'application/x-rar-compressed') return '📦';
          if (type === 'application/javascript' || type === 'text/css') return '💻';
          
          return '📁';
        }
        
        // DOM元素
        const fileInput = document.getElementById("file-input");
        const uploadArea = document.getElementById("upload-area");
        const uploadStatus = document.getElementById("upload-status");
        const userId = document.body.dataset.userid;
        const SHORTLINK_BASE = "https://s.example.com/";
        
        // 拖放上传功能
        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
          uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
          e.preventDefault();
          e.stopPropagation();
        }
        
        ["dragenter", "dragover"].forEach(eventName => {
          uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ["dragleave", "drop"].forEach(eventName => {
          uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
          uploadArea.classList.add("highlight");
        }
        
        function unhighlight() {
          uploadArea.classList.remove("highlight");
        }
        
        // 处理文件放置
        uploadArea.addEventListener("drop", handleDrop, false);
        
        function handleDrop(e) {
          const dt = e.dataTransfer;
          const files = dt.files;
          handleFiles(files);
        }
        
        // 处理文件选择
        fileInput.addEventListener("change", function() {
          handleFiles(this.files);
        });
        
        // 处理文件上传
        async function handleFiles(files) {
          if (files.length === 0) return;
          
          const file = files[0];
          const config = await getConfig();
          const maxSize = config.maxUploadSize * 1024 * 1024;
          
          if (file.size > maxSize) {
            uploadStatus.textContent = "\u274C 文件超过" + config.maxUploadSize + "MB限制";
            uploadStatus.style.color = "#ef4444";
            return;
          }
          
          uploadStatus.textContent = "\u23F3 上传中...";
          uploadStatus.style.color = "inherit";
          
          const formData = new FormData();
          formData.append("file", file);
          
          try {
            const response = await fetch("/upload", {
              method: "POST",
              body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
              uploadStatus.textContent = "\u2705 上传成功！";
              uploadStatus.style.color = "#10b981";
              addFileToUI(result.file);
            } else {
              uploadStatus.textContent = "\u274C 上传失败: " + result.message;
              uploadStatus.style.color = "#ef4444";
            }
          } catch (error) {
            uploadStatus.textContent = "\u274C 网络错误，请重试";
            uploadStatus.style.color = "#ef4444";
            console.error("Upload error:", error);
          }
        }
        
        // 添加新文件到UI
        function addFileToUI(file) {
          const fileListContainer = document.getElementById("file-list-container");
          const emptyState = fileListContainer.querySelector(".empty-state");
          
          if (emptyState) {
            emptyState.remove();
          }
          
          const fileSize = Math.round(file.size/1024) > 1024 
            ? (file.size/(1024*1024)).toFixed(1) + "MB" 
            : Math.round(file.size/1024) + "KB";
          
          const fileItem = document.createElement("div");
          fileItem.className = "file-item";
          fileItem.innerHTML = 
            '<div class="file-info">' +
              '<span class="file-icon">' + getFileIcon(file.type) + '</span>' +
              '<span class="file-name">' + file.name + '</span>' +
              '<span class="file-size">' + fileSize + '</span>' +
              '<span class="file-date">' + new Date().toLocaleDateString() + '</span>' +
            '</div>' +
            '<div class="file-actions">' +
              '<a href="/download/' + userId + '/' + file.id + '" class="btn btn-download">下载</a>' +
              '<a href="' + SHORTLINK_BASE + file.shortId + '" target="_blank" class="btn btn-shortlink">短链</a>' +
              '<button class="btn btn-preview" data-fileid="' + file.id + '" data-type="' + file.type + '">预览</button>' +
              '<button class="btn btn-delete" data-fileid="' + file.id + '">删除</button>' +
            '</div>';
          
          fileListContainer.prepend(fileItem);
          
          // 添加新文件的事件监听器
          addFileEventListeners(fileItem);
        }
        
        // 为文件添加事件监听器
        function addFileEventListeners(fileItem) {
          const deleteBtn = fileItem.querySelector(".btn-delete");
          const previewBtn = fileItem.querySelector(".btn-preview");
          
          deleteBtn.addEventListener("click", handleDeleteFile);
          previewBtn.addEventListener("click", handlePreviewFile);
        }
        
        // 处理文件删除
        async function handleDeleteFile(e) {
          const fileId = e.target.dataset.fileid;
          if (!confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u6587\u4EF6\u5417\uFF1F")) return;
          
          try {
            const response = await fetch("/delete/" + fileId, {
              method: "DELETE"
            });
            
            const result = await response.json();
            
            if (result.success) {
              e.target.closest(".file-item").remove();
              
              // 如果删除了所有文件，显示空状态
              const fileItems = document.querySelectorAll(".file-item");
              if (fileItems.length === 0) {
                const fileListContainer = document.getElementById("file-list-container");
                fileListContainer.innerHTML = 
                  '<div class="empty-state">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
                      '<polyline points="14 2 14 8 20 8"></polyline>' +
                      '<line x1="16" y1="13" x2="8" y2="13"></line>' +
                      '<line x1="16" y1="17" x2="8" y2="17"></line>' +
                      '<polyline points="10 9 9 9 8 9"></polyline>' +
                    '</svg>' +
                    '<p>暂无文件，请上传您的第一个文件</p>' +
                  '</div>';
              }
            } else {
              alert("\u5220\u9664\u5931\u8D25: " + result.message);
            }
          } catch (error) {
            alert("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5");
            console.error("Delete error:", error);
          }
        }
        
        // 处理文件预览
        async function handlePreviewFile(e) {
          const fileId = e.target.dataset.fileid;
          const fileType = e.target.dataset.type;
          
          try {
            const response = await fetch("/preview/" + fileId);
            
            if (!response.ok) {
              throw new Error("\u6587\u4EF6\u83B7\u53D6\u5931\u8D25");
            }
            // 查错：逐行检查并注释潜在问题

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const previewBody = document.getElementById("preview-body");
            previewBody.innerHTML = "";
            const previewTitle = document.getElementById("preview-title");

            // 检查fileType是否为字符串且有startsWith方法
            if (typeof fileType === "string" && fileType.startsWith("image/")) {
              previewTitle.textContent = "图片预览";
              const img = document.createElement("img");
              img.src = url;
              img.className = "preview-image";
              previewBody.appendChild(img);
            } 
            else if (typeof fileType === "string" && fileType.startsWith("audio/")) {
              previewTitle.textContent = "音频播放";
              const audio = document.createElement("audio");
              audio.src = url;
              audio.controls = true;
              audio.className = "preview-audio";
              previewBody.appendChild(audio);
            }
            else if (typeof fileType === "string" && fileType.startsWith("video/")) {
              previewTitle.textContent = "视频播放";
              const video = document.createElement("video");
              video.src = url;
              video.controls = true;
              video.className = "preview-video";
              video.style.width = "100%";
              previewBody.appendChild(video);
            }
            else if (fileType === "text/plain" || fileType === "application/json") {
              previewTitle.textContent = "文本预览";
              // blob.text() 可能会抛异常，建议加try-catch
              try {
                const text = await blob.text();
                const pre = document.createElement("pre");
                pre.textContent = text;
                pre.style.whiteSpace = "pre-wrap";
                pre.style.maxHeight = "500px";
                pre.style.overflow = "auto";
                previewBody.appendChild(pre);
              } catch (err) {
                previewBody.innerHTML = "<p>文本内容解析失败</p>";
              }
            }
            else {
              previewTitle.textContent = "文件预览";
              previewBody.innerHTML = 
                '<p>不支持在线预览此文件类型</p>' +
                '<p>请下载后查看: <a href="' + url + '" download>下载文件</a></p>';
            }

            // 检查previewModal是否存在
            const previewModal = document.getElementById("preview-modal");
            if (previewModal) {
              previewModal.classList.add("active");
            } else {
              console.error("未找到预览弹窗元素 #preview-modal");
            }
          } catch (error) {
            console.error("Preview error:", error);
            alert("预览失败: " + error.message);
          }
        }

        // 关闭预览
        const closePreview = document.getElementById("close-preview");
        if (closePreview) {
          closePreview.addEventListener("click", () => {
            const previewModal = document.getElementById("preview-modal");
            if (previewModal) previewModal.classList.remove("active");
          });
        }

        // 设置面板切换
        const settingsBtn = document.getElementById("settings-btn");
        const settingsPanel = document.getElementById("settings-panel");
        if (settingsBtn && settingsPanel) {
          settingsBtn.addEventListener("click", () => {
            settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
          });
        }

        // 颜色选择
        const colorOptions = document.querySelectorAll(".color-option");
        const themeColorInput = document.querySelector("input[name=\"themeColor\"]");
        if (colorOptions && themeColorInput) {
          colorOptions.forEach(option => {
            option.addEventListener("click", () => {
              colorOptions.forEach(opt => opt.classList.remove("active"));
              option.classList.add("active");
              themeColorInput.value = option.dataset.color;
            });
          });
        }

        // 退出登录
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", async () => {
            try {
              const response = await fetch("/logout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                }
              });
              
              if (response.ok) {
                // 清除本地cookie并刷新页面
                document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = "/";
              } else {
                alert("退出登录失败，请重试");
              }
            } catch (error) {
              console.error("退出登录错误:", error);
              alert("网络错误，请重试");
            }
          });
        }

        // 重置密码链接
        const resetLink = document.getElementById("reset-link");
        if (resetLink) {
          resetLink.addEventListener("click", (e) => {
            e.preventDefault();
            alert("请返回Telegram机器人，发送命令: /passwd 新密码");
          });
        }

        // 保存设置
        const settingsForm = document.getElementById("settings-form");
        if (settingsForm) {
          settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(settingsForm);
            const newPassword = formData.get("newPassword");
            const confirmPassword = formData.get("confirmPassword");

            if (newPassword && newPassword !== confirmPassword) {
              alert("两次输入的密码不一致");
              return;
            }

            const settings = {
              maxUploadSize: formData.get("maxUploadSize"),
              themeColor: formData.get("themeColor"),
              darkMode: formData.get("darkMode") === "on",
              bgImage: formData.get("bgImage") || "https://www.dmoe.cc/random.php"
            };

            try {
              const response = await fetch("/settings", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  settings,
                  newPassword: newPassword || undefined
                })
              });

              const result = await response.json();

              if (result.success) {
                alert("设置已保存");
                window.location.reload();
              } else {
                alert("保存失败: " + result.message);
              }
            } catch (error) {
              alert("网络错误，请重试");
              console.error("Settings error:", error);
            }
          });
        }

        // 删除所有文件
        const deleteAllBtn = document.getElementById("delete-all-btn");
        if (deleteAllBtn) {
          deleteAllBtn.addEventListener("click", () => {
            if (!confirm("确定要删除所有文件吗？此操作不可恢复！")) return;

            fetch("/delete-all", {
              method: "DELETE"
            })
            .then(response => response.json())
            .then(result => {
              if (result.success) {
                alert("所有文件已删除");
                window.location.reload();
              } else {
                alert("删除失败: " + result.message);
              }
            })
            .catch(error => {
              alert("网络错误，请重试");
              console.error("Delete all error:", error);
            });
          });
        }

        // 为现有文件添加事件监听器
        if (typeof addFileEventListeners === "function") {
          document.querySelectorAll(".file-item").forEach(item => {
            addFileEventListeners(item);
          });
        }

        // 加载下载任务列表
        if (typeof loadDownloadTasks === "function") {
          loadDownloadTasks();
        }
        
        // 加载群组文件列表
        if (typeof loadGroupFiles === "function") {
          loadGroupFiles();
        }
        
        // 网站离线下载功能
        const downloadUrlInput = document.getElementById("download-url");
        const startDownloadBtn = document.getElementById("start-download-btn");
        const downloadStatus = document.getElementById("download-status");
        
        if (startDownloadBtn && downloadUrlInput) {
          startDownloadBtn.addEventListener("click", async () => {
            const url = downloadUrlInput.value.trim();
            
            if (!url) {
              downloadStatus.textContent = "❌ 请输入下载链接";
              downloadStatus.style.color = "#ef4444";
              return;
            }
            
            if (!isValidUrl(url)) {
              downloadStatus.textContent = "❌ 无效的URL格式";
              downloadStatus.style.color = "#ef4444";
              return;
            }
            
            downloadStatus.textContent = "⏳ 正在启动离线下载...";
            downloadStatus.style.color = "inherit";
            
            try {
              const response = await fetch("/offline-download", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ url })
              });
              
              const result = await response.json();
              
              if (result.success) {
                downloadStatus.textContent = "✅ 离线下载任务已启动，请稍候...";
                downloadStatus.style.color = "#10b981";
                downloadUrlInput.value = "";
                
                // 刷新下载任务列表
                if (typeof loadDownloadTasks === "function") {
                  setTimeout(loadDownloadTasks, 1000);
                }
              } else {
                downloadStatus.textContent = "❌ " + result.message;
                downloadStatus.style.color = "#ef4444";
              }
            } catch (error) {
              downloadStatus.textContent = "❌ 网络错误，请重试";
              downloadStatus.style.color = "#ef4444";
              console.error("离线下载错误:", error);
            }
          });
        }
        
        // URL验证函数
        function isValidUrl(string) {
          try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch (_) {
            return false;
          }
        }

        // 获取全局配置
        const DEFAULT_CONFIG = { maxUploadSize: 10 };
        async function getConfig() {
          try {
            const response = await fetch("/config");
            const config = await response.json();
            return config;
          } catch (error) {
            console.error("Failed to get config:", error);
            return DEFAULT_CONFIG;
          }
        }

        // 加载下载任务列表
        async function loadDownloadTasks() {
          try {
            const response = await fetch("/download-tasks");
            const tasks = await response.json();

            const container = document.getElementById("download-tasks-container");

            if (!Array.isArray(tasks) || tasks.length === 0) {
              container.innerHTML = 
                '<div class="empty-state">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
                    '<polyline points="17 8 12 3 7 8"></polyline>' +
                    '<line x1="12" y1="3" x2="12" y2="15"></line>' +
                  '</svg>' +
                  '<p>暂无下载任务，在Telegram中发送链接开始离线下载</p>' +
                '</div>';
              return;
            }

            const escapeHTML = (str) => {
              if (!str) return '';
              return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
            };

            const taskList = tasks.slice(-10).reverse().map(task => {
              const statusClass = 'task-status-' + (task.status || 'unknown');
              const statusText = {
                'pending': '⏳ 等待中',
                'downloading': '⬇️ 下载中',
                'completed': '✅ 已完成',
                'failed': '❌ 失败'
              }[task.status] || '❓ 未知';

              const fileSize = task.fileSize ? 
                (Math.round(task.fileSize / 1024) > 1024 
                  ? (task.fileSize / (1024 * 1024)).toFixed(1) + 'MB' 
                  : Math.round(task.fileSize / 1024) + 'KB') : '-';

              // SHORTLINK_BASE 需确保已定义
              const shortLink = (typeof SHORTLINK_BASE !== "undefined" && task.shortId) ? 
                '<a href="' + escapeHTML(SHORTLINK_BASE + task.shortId) + '" target="_blank" class="btn btn-download">下载</a>' : '';

              const deleteBtn = '<button class="btn btn-delete" data-taskid="' + escapeHTML(task.id) + '">删除</button>';

              return (
                '<div class="download-task-item">' +
                  '<div class="task-col-status">' +
                    '<span class="task-status ' + escapeHTML(statusClass) + '">' + escapeHTML(statusText) + '</span>' +
                  '</div>' +
                  '<div class="task-col-url">' +
                    '<div class="task-url">' + escapeHTML(task.url) + '</div>' +
                  '</div>' +
                  '<div class="task-col-filename">' +
                    '<div class="task-filename">' + escapeHTML(task.fileName || '未知') + '</div>' +
                  '</div>' +
                  '<div class="task-col-size">' +
                    '<div class="task-size">' + escapeHTML(fileSize) + '</div>' +
                  '</div>' +
                  '<div class="task-col-date">' +
                    '<div class="task-date">' + (task.createdAt ? new Date(task.createdAt).toLocaleString() : '-') + '</div>' +
                  '</div>' +
                  '<div class="task-col-actions">' +
                    '<div class="task-actions">' +
                      shortLink +
                      deleteBtn +
                    '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('');

            container.innerHTML = taskList;

            // 为删除按钮添加事件监听器
            document.querySelectorAll(".task-actions .btn-delete").forEach(btn => {
              btn.addEventListener("click", handleDeleteTask);
            });

          } catch (error) {
            console.error("加载下载任务失败:", error);
          }
        }

                // 处理删除下载任务
        async function handleDeleteTask(e) {
          const taskId = e.target.dataset.taskid;
          if (!confirm("确定要删除这个下载任务吗？")) return;
          
          try {
            const response = await fetch("/delete-task/" + encodeURIComponent(taskId), {
              method: "DELETE"
            });
            
            const result = await response.json();
            
            if (result.success) {
              loadDownloadTasks(); // 重新加载任务列表
            } else {
              alert("删除失败: " + result.message);
            }
          } catch (error) {
            alert("网络错误，请重试");
            console.error("Delete task error:", error);
          }
        }
        
        // 加载群组文件列表
        async function loadGroupFiles() {
          try {
            const response = await fetch("/group-files");
            const files = await response.json();
            
            const container = document.getElementById("group-files-container");
            
            if (!Array.isArray(files) || files.length === 0) {
              container.innerHTML = 
                '<div class="empty-state">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
                    '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>' +
                  '</svg>' +
                  '<p>暂无群组文件</p>' +
                '</div>';
              return;
            }
            
            const escapeHTML = (str) => {
              if (!str) return '';
              return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
            };
            
            const fileList = files.slice(-10).reverse().map(file => {
              const fileSize = Math.round(file.fileSize / 1024) > 1024 
                ? (file.fileSize / (1024 * 1024)).toFixed(1) + 'MB' 
                : Math.round(file.fileSize / 1024) + 'KB';
              
              const downloadLink = '<a href="/group-download/' + escapeHTML(file.uuid) + '" class="btn btn-download">下载</a>';
              const copyUuidBtn = '<button class="btn btn-shortlink" data-uuid="' + escapeHTML(file.uuid) + '">复制UUID</button>';
              
              return (
                '<div class="group-file-item">' +
                  '<div class="group-col-filename">' +
                    '<div class="group-filename">' + escapeHTML(file.fileName) + '</div>' +
                  '</div>' +
                  '<div class="group-col-size">' +
                    '<div class="group-size">' + escapeHTML(fileSize) + '</div>' +
                  '</div>' +
                  '<div class="group-col-uuid">' +
                    '<div class="group-uuid">' + escapeHTML(file.uuid) + '</div>' +
                  '</div>' +
                  '<div class="group-col-date">' +
                    '<div class="group-date">' + (file.uploaded ? new Date(file.uploaded).toLocaleString() : '-') + '</div>' +
                  '</div>' +
                  '<div class="group-col-actions">' +
                    '<div class="group-actions">' +
                      downloadLink +
                      copyUuidBtn +
                    '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('');
            
            container.innerHTML = fileList;
            
            // 为复制UUID按钮添加事件监听器
            document.querySelectorAll(".group-actions .btn-shortlink").forEach(btn => {
              btn.addEventListener("click", handleCopyUuid);
            });
            
          } catch (error) {
            console.error("加载群组文件失败:", error);
          }
        }
        
        // 处理复制UUID
        async function handleCopyUuid(e) {
          const uuid = e.target.dataset.uuid;
          
          try {
            await navigator.clipboard.writeText(uuid);
            e.target.textContent = "已复制";
            e.target.style.background = "#10b981";
            
            setTimeout(() => {
              e.target.textContent = "复制UUID";
              e.target.style.background = "";
            }, 2000);
          } catch (error) {
            // 降级方案
            const textArea = document.createElement("textarea");
            textArea.value = uuid;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            
            e.target.textContent = "已复制";
            e.target.style.background = "#10b981";
            
            setTimeout(() => {
              e.target.textContent = "复制UUID";
              e.target.style.background = "";
            }, 2000);
          }
        }

        // 加载IP日志列表
        async function loadIPLogs() {
          try {
            const response = await fetch("/ip-logs?limit=50");
            const logs = await response.json();
            
            const container = document.getElementById("ip-logs-container");
            
            if (!Array.isArray(logs) || logs.length === 0) {
              container.innerHTML = 
                '<div class="empty-state">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
                    '<polyline points="14 2 14 8 20 8"></polyline>' +
                    '<line x1="16" y1="13" x2="8" y2="13"></line>' +
                    '<line x1="16" y1="17" x2="8" y2="17"></line>' +
                    '<polyline points="10 9 9 9 8 9"></polyline>' +
                  '</svg>' +
                  '<p>暂无访问记录</p>' +
                '</div>';
              return;
            }
            
            const escapeHTML = (str) => {
              if (!str) return '';
              return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
            };
            
            const logList = logs.map(log => {
              const time = new Date(log.timestamp).toLocaleString('zh-CN');
              // 修正location赋值语句
              const location = (log.geoipInfo && log.geoipInfo.city && log.geoipInfo.country)
                ? escapeHTML(log.geoipInfo.city) + ', ' + escapeHTML(log.geoipInfo.country)
                : '未知位置';
              const deviceClass = log.isBot ? 'ip-device-bot' : 'ip-device-user';
              const deviceText = log.isBot ? '🤖 机器人' : '👤 用户';
              
              return (
                '<div class="ip-log-item">' +
                  '<div class="ip-col-time">' +
                    '<div class="ip-time">' + escapeHTML(time) + '</div>' +
                  '</div>' +
                  '<div class="ip-col-ip">' +
                    '<div class="ip-address">' + escapeHTML(log.ip) + '</div>' +
                  '</div>' +
                  '<div class="ip-col-location">' +
                    '<div class="ip-location">' + escapeHTML(location) + '</div>' +
                  '</div>' +
                  '<div class="ip-col-path">' +
                    '<div class="ip-path">' + escapeHTML(log.path) + '</div>' +
                  '</div>' +
                  '<div class="ip-col-device">' +
                    '<div class="ip-device ' + deviceClass + '">' + deviceText + '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('');
            
            container.innerHTML = logList;
            
          } catch (error) {
            console.error("加载IP日志失败:", error);
          }
        }
        
        // 获取文件图标
        function getFileIcon(type) {
          if (!type) return "📁";

          if (type.startsWith("text/") || type === "application/json") return "📄";
          if (type.startsWith("image/")) return "🖼️";
          if (type.startsWith("audio/")) return "🎵";
          if (type.startsWith("video/")) return "🎬";
          if (type === "application/pdf") return "📃";
          if (type === "application/zip" || type === "application/x-rar-compressed") return "📦";
          if (type === "application/javascript" || type === "text/css") return "💻";

          return "📁";
        }
        
        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', function() {
          // 加载各种数据
          loadDownloadTasks();
          loadGroupFiles();
          
          // 如果是管理员，加载IP日志
          if (document.body.dataset.userid === 'admin') {
            loadIPLogs();
          }
        });
      </script>
    </body>
    </html>
  `;
}

// 主要的请求处理函数
export default {
  async fetch(request, env, ctx) {
    // 强制HTTPS
    const httpsRedirect = enforceHTTPS(request);
    if (httpsRedirect) return httpsRedirect;
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // IP记录处理
    const auth = new AuthManager(env);
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('User-Agent');
    
    if (clientIP && await auth.shouldLogIP(clientIP, path)) {
      // 异步记录IP访问，不阻塞主流程
      auth.logIPVisit(clientIP, userAgent, path, env).catch(error => {
        console.error('IP记录失败:', error);
      });
    }
    
    // 处理Webhook设置
    if (path === '/webhookset') {
      return await setWebhook(request);
    }
    
    // 处理Telegram Webhook更新
    if (path === WEBHOOK_PATH && request.method === 'POST') {
      return await handleWebhookUpdate(request, env);
    }
    
    // 处理短链接重定向
    if (path.startsWith('/s/')) {
      const shortId = path.slice(3);
      const fileData = await auth.getFileByShortId(shortId);
      
      if (!fileData) {
        return new Response('文件不存在', { status: 404 });
      }
      
      return new Response(fileData.content, {
        headers: {
          'Content-Type': fileData.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileData.name}"`
        }
      });
    }
    
    // 处理文件下载
    if (path.startsWith('/download/')) {
      const parts = path.split('/');
      const userId = parts[2];
      const fileId = parts[3];
      
      const fileContent = await auth.getFile(userId, fileId);
      const files = await auth.getFiles(userId);
      const fileInfo = files.find(f => f.id === fileId);
      
      if (!fileContent || !fileInfo) {
        return new Response('文件不存在', { status: 404 });
      }
      
      return new Response(fileContent, {
        headers: {
          'Content-Type': fileInfo.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileInfo.name}"`
        }
      });
    }
    
    // 处理文件预览
    if (path.startsWith('/preview/')) {
      const fileId = path.split('/')[2];
      
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response('未授权', { status: 401 });
      }
      
      const { userId, auth } = authResult;
      const fileContent = await auth.getFile(userId, fileId);
      const files = await auth.getFiles(userId);
      const fileInfo = files.find(f => f.id === fileId);
      
      if (!fileContent || !fileInfo) {
        return new Response('文件不存在', { status: 404 });
      }
      
      return new Response(fileContent, {
        headers: {
          'Content-Type': fileInfo.type || 'application/octet-stream'
        }
      });
    }
    
    // 处理文件上传
    if (path === '/upload' && request.method === 'POST') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) {
          return new Response(JSON.stringify({ success: false, message: '没有文件' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const config = await auth.getGlobalConfig();
        const maxSize = config.maxUploadSize * 1024 * 1024;
        
        if (file.size > maxSize) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `文件超过${config.maxUploadSize}MB限制` 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const fileContent = await file.arrayBuffer();
        const { fileId, shortId } = await auth.saveFile(userId, file.name, fileContent, file.type);
        
        return new Response(JSON.stringify({
          success: true,
          file: {
            id: fileId,
            shortId,
            name: file.name,
            type: file.type,
            size: file.size
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理文件删除
    if (path.startsWith('/delete/') && request.method === 'DELETE') {
      const fileId = path.split('/')[2];
      
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      
      try {
        await auth.deleteFile(userId, fileId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理删除所有文件
    if (path === '/delete-all' && request.method === 'DELETE') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      
      try {
        await auth.deleteAllFiles(userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理设置保存
    if (path === '/settings' && request.method === 'POST') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      
      try {
        const data = await request.json();
        const { settings, newPassword } = data;
        
        // 更新全局配置（仅管理员）
        if (userId === 'admin') {
          await auth.updateGlobalConfig(settings);
        }
        
        // 更新密码
        if (newPassword) {
          await auth.setPassword(userId, newPassword);
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理配置获取
    if (path === '/config') {
      const auth = new AuthManager(env);
      const config = await auth.getGlobalConfig();
      
      return new Response(JSON.stringify(config), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理下载任务获取
    if (path === '/download-tasks') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      const tasks = await auth.getDownloadTasks(userId);
      return new Response(JSON.stringify(tasks), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理删除下载任务
    if (path.startsWith('/delete-task/') && request.method === 'DELETE') {
      const taskId = path.split('/')[2];
      
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      
      try {
        await auth.deleteDownloadTask(userId, taskId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理网站离线下载
    if (path === '/offline-download' && request.method === 'POST') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId } = authResult;
      
      try {
        const data = await request.json();
        const { url } = data;
        
        if (!url || !isValidUrl(url)) {
          return new Response(JSON.stringify({ success: false, message: '无效的URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 开始离线下载（网站版本，不发送Telegram消息）
        const taskId = generateFileId();
        const task = {
          id: taskId,
          url: url,
          status: 'pending',
          createdAt: new Date().toISOString(),
          userId: userId,
          chatId: null // 网站版本不需要chatId
        };
        
        const auth = new AuthManager(env);
        await auth.saveDownloadTask(userId, task);
        
        // 异步执行下载
        downloadFileAsync(url, userId, taskId, env);
        
        return new Response(JSON.stringify({ success: true, message: '离线下载任务已启动' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理群组文件下载
    if (path.startsWith('/group-download/')) {
      const uuid = path.split('/')[2];
      const auth = new AuthManager(env);
      
      const fileData = await auth.getGroupFileByUuid(uuid);
      if (!fileData) {
        return new Response('文件不存在', { status: 404 });
      }
      
      return new Response(fileData.content, {
        headers: {
          'Content-Type': fileData.fileType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileData.fileName}"`
        }
      });
    }
    
    // 处理群组文件列表获取
    if (path === '/group-files') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      const groupFiles = await auth.getUserGroupFiles(userId);
      
      return new Response(JSON.stringify(groupFiles), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理IP日志获取
    if (path === '/ip-logs') {
      const authResult = await authenticateRequest(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ success: false, message: authResult.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { userId, auth } = authResult;
      
      // 只有管理员可以查看IP日志
      if (userId !== 'admin') {
        return new Response(JSON.stringify({ success: false, message: '权限不足' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const ipLogs = await auth.getIPLogs(limit);
      
      return new Response(JSON.stringify(ipLogs), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理登录
    if (path === '/login' && request.method === 'POST') {
      const auth = new AuthManager(env);
      const formData = await request.formData();
      const userId = formData.get('userId');
      const password = formData.get('password');
      
      const token = await auth.generateAuthToken(userId, password);
      
      if (token) {
        const response = new Response('', {
          status: 302,
          headers: {
            'Location': '/',
            'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
          }
        });
        return response;
      } else {
        return new Response('', {
          status: 302,
          headers: {
            'Location': '/?error=invalid'
          }
        });
      }
    }
    
    // 处理退出登录
    if (path === '/logout' && request.method === 'POST') {
      const auth = new AuthManager(env);
      
      // 从cookie获取token
      const cookies = request.headers.get('cookie') || '';
      const tokenMatch = cookies.match(/auth_token=([^;]+)/);
      
      if (tokenMatch) {
        const token = tokenMatch[1];
        await auth.revokeAuthToken(token);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
        }
      });
    }
    
    // 处理主页
    if (path === '/' || path === '') {
      const auth = new AuthManager(env);
      const config = await auth.getGlobalConfig();
      
      // 检查是否已登录
      const cookies = request.headers.get('cookie') || '';
      const tokenMatch = cookies.match(/auth_token=([^;]+)/);
      
      if (tokenMatch) {
        const token = tokenMatch[1];
        const userId = await auth.validateAuthToken(token);
        if (userId) {
          return new Response(await renderDashboard(request, env, userId, config), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      }
      
      // 显示登录页面
      const errorMsg = url.searchParams.get('error') === 'invalid' ? 
        '<p style="color: #ef4444; margin-top: 10px;">用户名或密码错误</p>' : '';
      
      return new Response(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Telegram云盘 - 登录</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .login-container {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(10px);
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
              width: 100%;
              max-width: 400px;
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 30px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              margin-bottom: 8px;
              color: #555;
              font-weight: 500;
            }
            input {
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 16px;
              box-sizing: border-box;
            }
            button {
              width: 100%;
              padding: 12px;
              background: #2563eb;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.3s;
            }
            button:hover {
              background: #1d4ed8;
            }
            .notice {
              margin-top: 20px;
              padding: 15px;
              background: #fef3c7;
              border-radius: 6px;
              font-size: 14px;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="login-container">
            <h1>📁 Telegram 云存储</h1>
            <form method="POST" action="/login">
              <div class="form-group">
                <label for="userId">用户ID</label>
                <input type="text" id="userId" name="userId" required placeholder="您的Telegram ID">
              </div>
              <div class="form-group">
                <label for="password">密码</label>
                <input type="password" id="password" name="password" required placeholder="您的密码">
              </div>
              <button type="submit">登录</button>
              ${errorMsg}
            </form>
            <div class="notice">
              <strong>首次使用？</strong><br>
              请先在Telegram机器人中发送 <code>/passwd 您的密码</code> 来设置密码
            </div>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // 404处理
    return new Response('页面不存在', { status: 404 });
  }
};