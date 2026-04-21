#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PdfTools, NSObject)

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
                  password:(NSString *)password
                  filename:(NSString *)filename
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(compressPdf:(NSString *)pdfUri
                  quality:(NSString *)quality
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPageCount:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeWatermark:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(embedSignature:(NSString *)pdfUri
                  signatureUri:(NSString *)signatureUri
                  pageNumber:(int)pageNumber
                  x:(CGFloat)x
                  y:(CGFloat)y
                  width:(CGFloat)width
                  height:(CGFloat)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
