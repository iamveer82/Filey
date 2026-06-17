#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(BrushCanvasManager, RCTViewManager)

// Configurable props
RCT_EXPORT_VIEW_PROPERTY(tool, NSString)
RCT_EXPORT_VIEW_PROPERTY(strokeColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(strokeWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(backgroundUri, NSString)
RCT_EXPORT_VIEW_PROPERTY(showToolPicker, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onExport, RCTDirectEventBlock)

// Imperative ops dispatched via NativeModules.BrushCanvasManager
RCT_EXTERN_METHOD(exportPng:(nonnull NSNumber *)reactTag
                  scale:(nonnull NSNumber *)scale
                  composite:(nonnull NSNumber *)composite
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clear:(nonnull NSNumber *)reactTag)
RCT_EXTERN_METHOD(undo:(nonnull NSNumber *)reactTag)
RCT_EXTERN_METHOD(redo:(nonnull NSNumber *)reactTag)

@end
