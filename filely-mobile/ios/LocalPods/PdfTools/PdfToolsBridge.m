#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(PdfTools, RCTEventEmitter)

RCT_EXTERN_METHOD(mergePdfs:(NSArray *)pdfUris
                  filename:(NSString *)filename
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(splitPdf:(NSString *)pdfUri
                  ranges:(NSArray *)ranges
                  filename:(NSString *)filename
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(protectPdf:(NSString *)pdfUri
                  userPassword:(NSString *)userPassword
                  ownerPassword:(NSString *)ownerPassword
                  filename:(NSString *)filename
                  permissions:(NSDictionary *)permissions
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(compressPdf:(NSString *)pdfUri
                  quality:(NSString *)quality
                  targetSizeKB:(NSInteger)targetSizeKB
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPageCount:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(embedSignature:(NSString *)pdfUri
                  signatureUri:(NSString *)signatureUri
                  pageNumber:(NSInteger)pageNumber
                  x:(CGFloat)x
                  y:(CGFloat)y
                  width:(CGFloat)width
                  height:(CGFloat)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addWatermark:(NSString *)pdfUri
                  text:(NSString *)text
                  imageUri:(NSString *)imageUri
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeWatermark:(NSString *)pdfUri
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
