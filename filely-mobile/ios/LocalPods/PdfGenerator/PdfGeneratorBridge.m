#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PdfGenerator, NSObject)

RCT_EXTERN_METHOD(generatePdf:(NSArray *)imageUris
                  filename:(NSString *)filename
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generatePdfFromImages:(NSArray *)imageUris
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
