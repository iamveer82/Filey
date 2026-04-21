#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNVisionOcr, NSObject)

RCT_EXTERN_METHOD(recognizeText:(NSString *)imageUri
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSupportedLanguages:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
