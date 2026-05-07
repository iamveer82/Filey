module.exports = new Proxy({}, { get: () => () => undefined });
module.exports.EncodingType = { UTF8: 'utf8', Base64: 'base64' };
module.exports.cacheDirectory = '/tmp/';
