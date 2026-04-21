#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VisionEdgeDetection, NSObject)

RCT_EXTERN_METHOD(detectEdges:(NSString *)imageUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(applyPerspectiveCorrection:(NSString *)imageUri
                  corners:(NSArray *)corners
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cropDocument:(NSString *)imageUri
                  corners:(NSArray *)corners
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
