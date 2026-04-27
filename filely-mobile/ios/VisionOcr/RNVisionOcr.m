// RNVisionOcr.m
// Vision OCR Module - Apple Vision Framework Integration
// Provides text recognition from receipt images using VNRecognizeTextRequest

#import "RNVisionOcr.h"
#import <Vision/Vision.h>
#import <CoreImage/CoreImage.h>
#import <UIKit/UIKit.h>

@implementation RNVisionOcr {
    BOOL hasListeners;
}

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents {
    return @[@"ocrProgress", @"ocrComplete", @"ocrError"];
}

- (void)startObserving {
    hasListeners = YES;
}

- (void)stopObserving {
    hasListeners = NO;
}

// Exported method: recognizeText(imageUri)
RCT_EXPORT_METHOD(recognizeText:(NSString *)imageUri
                  options:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            // Parse image URI - handle file:// and base64 formats
            UIImage *image = [self loadImageFromUri:imageUri];

            if (!image) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    reject(@"INVALID_IMAGE", @"Failed to load image from URI", nil);
                });
                return;
            }

            NSArray<NSString *> *languages = options[@"languages"] ?: @[@"ar-SA", @"en-US"];

            // Perform OCR using Vision framework
            [self recognizeTextInImage:image languages:languages completion:^(NSDictionary *result, NSError *error) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (error) {
                        reject(@"OCR_ERROR", error.localizedDescription, error);
                    } else {
                        resolve(result);
                    }
                });
            }];

        } @catch (NSException *exception) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"EXCEPTION", exception.reason, nil);
            });
        }
    });
}

// Load image from URI (file:// or base64 data URI)
- (UIImage *)loadImageFromUri:(NSString *)uri {
    if ([uri hasPrefix:@"data:image"]) {
        // Base64 data URI
        NSRange commaRange = [uri rangeOfString:@","];
        if (commaRange.location == NSNotFound) {
            return nil;
        }
        NSString *base64String = [uri substringFromIndex:commaRange.location + commaRange.length];
        NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64String options:0];
        return [UIImage imageWithData:imageData];
    } else if ([uri hasPrefix:@"file://"]) {
        // File path
        NSString *filePath = [uri stringByReplacingOccurrencesOfString:@"file://" withString:@""];
        filePath = [filePath stringByRemovingPercentEncoding];
        return [UIImage imageWithContentsOfFile:filePath];
    } else if ([uri hasPrefix:@"/"]) {
        // Absolute path without file://
        return [UIImage imageWithContentsOfFile:uri];
    } else {
        // Try as regular path
        return [UIImage imageWithContentsOfFile:uri];
    }
}

// Perform OCR using Vision framework
- (void)recognizeTextInImage:(UIImage *)image languages:(NSArray<NSString *> *)languages completion:(void(^)(NSDictionary *, NSError *))completion {
    CIImage *ciImage = [CIImage imageWithCGImage:image.CGImage];

    // Create text recognition request with accuracy level
    VNRecognizeTextRequest *recognizeRequest = [VNRecognizeTextRequest new];
    recognizeRequest.recognitionLevels = VNImageTextRecognitionLevelAccurate;
    recognizeRequest.usesLanguageCorrection = YES;
    recognizeRequest.recognitionLanguages = (languages.count > 0) ? languages : @[@"ar-SA", @"en-US"];

    // Create image request handler with the actual image
    VNImageRequestHandler *requestHandler = [[VNImageRequestHandler alloc] initWithCIImage:ciImage options:@{}];

    NSError *error = nil;
    BOOL success = [requestHandler performRequests:@[recognizeRequest] error:&error];

    if (!success || error) {
        completion(nil, error ?: [NSError errorWithDomain:@"VisionOCR" code:-1 userInfo:@{NSLocalizedDescriptionKey: @"Failed to perform OCR"}]);
        return;
    }

    // Process recognition results
    NSMutableArray *regions = [NSMutableArray array];
    NSMutableString *fullText = [NSMutableString string];
    double totalConfidence = 0.0;
    int regionCount = 0;

    for (VNRecognizedTextObservation *observation in recognizeRequest.results) {
        for (VNRecognizedText *recognizedText in observation.topCandidates) {
            NSString *text = recognizedText.string;
            float confidence = recognizedText.confidence;

            if (text.length > 0) {
                [fullText appendString:text];
                [fullText appendString:@"\n"];

                [regions addObject:@{
                    @"text": text,
                    @"confidence": @(confidence),
                    @"bounds": @{
                        @"x": @(observation.boundingBox.origin.x),
                        @"y": @(observation.boundingBox.origin.y),
                        @"width": @(observation.boundingBox.size.width),
                        @"height": @(observation.boundingBox.size.height)
                    }
                }];

                totalConfidence += confidence;
                regionCount++;
            }
        }
    }

    double averageConfidence = regionCount > 0 ? totalConfidence / regionCount : 0.0;

    NSDictionary *result = @{
        @"text": [fullText stringByTrimmingCharactersInSet:[NSCharacterSet newlineCharacterSet]],
        @"confidence": @(averageConfidence),
        @"regions": [regions copy]
    };

    completion(result, nil);
}

// Exported method: isAvailable()
RCT_EXPORT_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    // Vision framework is available on iOS 10.3+
    if (@available(iOS 10.3, *)) {
        resolve(@YES);
    } else {
        resolve(@NO);
    }
}

@end
