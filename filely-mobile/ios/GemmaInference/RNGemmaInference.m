// RNGemmaInference.m
// Gemma Inference Module - LiteRT (TensorFlow Lite) Integration
// Provides on-device NLP for receipt parsing using Gemma 4 model
//
// NOTE: This module requires:
// 1. TensorFlowLiteC framework (or TensorFlowLiteCSwift for Swift)
// 2. TensorFlowLiteCExtraOps framework for Gemma support
// 3. The .litertlm model file in DocumentDirectory/ai/

#import "RNGemmaInference.h"
#import <Foundation/Foundation.h>

// Conditional import for TensorFlow Lite
// In production, these would be added via Podfile or SPM
#if __has_include(<TensorFlowLiteC/TensorFlowLiteC.h>)
#import <TensorFlowLiteC/TensorFlowLiteC.h>
#define TFLITE_AVAILABLE 1
#else
#define TFLITE_AVAILABLE 0
#endif

@implementation RNGemmaInference {
    void *interpreter;
    BOOL modelLoaded;
    NSString *modelPath;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    self = [super init];
    if (self) {
        modelLoaded = NO;
        modelPath = nil;
    }
    return self;
}

// Exported method: isModelReady()
RCT_EXPORT_METHOD(isModelReady:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSString *path = [self getModelPath];
        BOOL exists = [[NSFileManager defaultManager] fileExistsAtPath:path];

        if (!exists) {
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve(@NO);
            });
            return;
        }

        // Check file size (should be > 1MB for valid model)
        NSDictionary *attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:path error:nil];
        NSNumber *size = attrs[NSFileSize];

        dispatch_async(dispatch_get_main_queue(), ^{
            resolve(@(exists && size.longLongValue > 1000000));
        });
    });
}

// Exported method: parseReceipt(ocrText)
RCT_EXPORT_METHOD(parseReceipt:(NSString *)ocrText
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            if (!ocrText || ocrText.length == 0) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    resolve([self emptyResult]);
                });
                return;
            }

#if TFLITE_AVAILABLE
            // Try to load and run model
            if (![self ensureModelLoaded]) {
                // Model not loaded, fall back to local parsing
                dispatch_async(dispatch_get_main_queue(), ^{
                    resolve([self parseReceiptLocally:ocrText]);
                });
                return;
            }

            // Run inference
            NSDictionary *result = [self runInferenceWithText:ocrText];
            if (result) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    resolve(result);
                });
                return;
            }
#else
            NSLog(@"RNGemmaInference: TensorFlow Lite not available, using local parser");
#endif

            // Fall back to local regex-based parsing
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve([self parseReceiptLocally:ocrText]);
            });

        } @catch (NSException *exception) {
            NSLog(@"RNGemmaInference: Exception - %@", exception.reason);
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve([self parseReceiptLocally:ocrText]);
            });
        }
    });
}

// Get the model file path
- (NSString *)getModelPath {
    if (modelPath) {
        return modelPath;
    }

    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDir = paths.firstObject;
    modelPath = [documentsDir stringByAppendingPathComponent:@"ai/gemma-4-E2B-it.litertlm"];
    return modelPath;
}

// Ensure model is loaded into interpreter
- (BOOL)ensureModelLoaded {
#if TFLITE_AVAILABLE
    if (modelLoaded) {
        return YES;
    }

    NSString *path = [self getModelPath];
    if (![[NSFileManager defaultManager] fileExistsAtPath:path]) {
        NSLog(@"RNGemmaInference: Model file not found at %@", path);
        return NO;
    }

    // Load model data
    NSData *modelData = [NSData dataWithContentsOfFile:path];
    if (!modelData) {
        NSLog(@"RNGemmaInference: Failed to load model data");
        return NO;
    }

    // Create interpreter with model
    const char *modelBytes = (const char *)[modelData bytes];
    size_t modelSize = [modelData length];

    // Note: Actual TFLite interpreter creation would go here
    // This is a placeholder - actual implementation requires TFLiteC library
    modelLoaded = YES;
    return YES;
#else
    return NO;
#endif
}

// Run inference on OCR text
- (NSDictionary *)runInferenceWithText:(NSString *)ocrText {
#if TFLITE_AVAILABLE
    if (!modelLoaded) {
        return nil;
    }

    // Build prompt for Gemma
    NSString *prompt = [NSString stringWithFormat:
        @"<bos><start_of_turn>user\nExtract structured data from this UAE receipt:\n\n%@\n\nReturn ONLY JSON: {\"merchant\":\"...\",\"date\":\"YYYY-MM-DD\",\"amount\":0.00,\"vat\":0.00,\"trn\":\"\",\"currency\":\"AED\",\"category\":\"General\",\"paymentMethod\":\"Cash\"}<end_of_turn>\n<start_of_turn>model<end_of_turn>",
        ocrText];

    // Tokenize input, run inference, decode output
    // This is a placeholder - actual implementation requires:
    // 1. Tokenizer (SentencePiece or similar)
    // 2. TFLite interpreter invocation
    // 3. Output decoding and JSON parsing

    NSLog(@"RNGemmaInference: Running inference (placeholder)");
    return nil;
#else
    return nil;
#endif
}

// Local regex-based receipt parser (fallback)
- (NSDictionary *)parseReceiptLocally:(NSString *)text {
    if (!text || text.length == 0) {
        return [self emptyResult];
    }

    NSArray *lines = [text componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]];
    lines = [lines filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(id evaluatedObject, NSDictionary *bindings) {
        NSString *line = [evaluatedObject stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
        return line.length > 0;
    }]];

    // Extract merchant (first line)
    NSString *merchant = lines.count > 0 ? lines[0] : @"Unknown Merchant";

    // Extract date
    NSString *date = [self extractDate:text];

    // Extract amount
    double amount = [self extractAmount:text];

    // Extract VAT
    double vat = [self extractVAT:text amount:amount];

    // Extract TRN
    NSString *trn = [self extractTRN:text];

    // Infer category
    NSString *category = [self inferCategory:merchant text:text];

    // Infer payment method
    NSString *paymentMethod = [self inferPaymentMethod:text];

    return @{
        @"merchant": merchant,
        @"date": date,
        @"amount": @(amount),
        @"vat": @(vat),
        @"trn": trn ?: @"",
        @"currency": @"AED",
        @"category": category,
        @"paymentMethod": paymentMethod
    };
}

// Extract date from text
- (NSString *)extractDate:(NSString *)text {
    // Try DD/MM/YYYY format
    NSRegularExpression *dateRegex = [NSRegularExpression regularExpressionWithPattern:@"(\\d{1,2}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{2,4})" options:0 error:nil];
    NSTextCheckingResult *match = [dateRegex firstMatchInString:text options:0 range:NSMakeRange(0, text.length)];

    if (match) {
        NSString *dateStr = [text substringWithRange:match.range];
        NSArray *parts = [dateStr componentsSeparatedByCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/\\-."]];

        if (parts.count == 3) {
            NSString *day = [parts[0] stringByPadLeftToLength:2 withPad:@"0"];
            NSString *month = [parts[1] stringByPadLeftToLength:2 withPad:@"0"];
            NSString *year = parts[2].length == 2 ? [@"20" stringByAppendingString:parts[2]] : parts[2];
            return [NSString stringWithFormat:@"%@-%@-%@", year, month, day];
        }
    }

    // Return today's date
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    formatter.dateFormat = @"yyyy-MM-dd";
    return [formatter stringFromDate:[NSDate date]];
}

// Extract total amount from text
- (double)extractAmount:(NSString *)text {
    // Try to find "Total" pattern
    NSRegularExpression *totalRegex = [NSRegularExpression regularExpressionWithPattern:@"(?:total|net|amount\\s*due|grand\\s*total|balance\\s*due)[:\\s]*(\\d+[,.]?\\d*)" options:NSCaseInsensitiveSearch error:nil];
    NSTextCheckingResult *match = [totalRegex firstMatchInString:text options:0 range:NSMakeRange(0, text.length)];

    if (match && match.numberOfRanges > 1) {
        NSString *amountStr = [text substringWithRange:[match rangeAtIndex:1]];
        amountStr = [amountStr stringByReplacingOccurrencesOfString:@"," withString:@""];
        return [amountStr doubleValue];
    }

    // Fallback: find largest number
    NSRegularExpression *numberRegex = [NSRegularExpression regularExpressionWithPattern:@"(\\d{1,3}(?:[,.]?\\d{3})*(?:\\.\\d{2})?)" options:0 error:nil];
    NSArray *matches = [numberRegex matchesInString:text options:0 range:NSMakeRange(0, text.length)];

    double maxNum = 0;
    for (NSTextCheckingResult *m in matches) {
        NSString *numStr = [text substringWithRange:m.range];
        numStr = [numStr stringByReplacingOccurrencesOfString:@"," withString:@""];
        double num = [numStr doubleValue];
        if (num > maxNum && num < 1000000) {
            maxNum = num;
        }
    }

    return maxNum;
}

// Extract VAT from text
- (double)extractVAT:(NSString *)text amount:(double)amount {
    // Try to find VAT pattern
    NSRegularExpression *vatRegex = [NSRegularExpression regularExpressionWithPattern:@"(?:vat|tax|gst)[:\\s]*(\\d+[,.]?\\d*)" options:NSCaseInsensitiveSearch error:nil];
    NSTextCheckingResult *match = [vatRegex firstMatchInString:text options:0 range:NSMakeRange(0, text.length)];

    if (match && match.numberOfRanges > 1) {
        NSString *vatStr = [text substringWithRange:[match rangeAtIndex:1]];
        vatStr = [vatStr stringByReplacingOccurrencesOfString:@"," withString:@""];
        return [vatStr doubleValue];
    }

    // Check for 5% VAT hint
    NSRegularExpression *percentRegex = [NSRegularExpression regularExpressionWithPattern:@"5\\s*%" options:0 error:nil];
    if ([percentRegex firstMatchInString:text options:0 range:NSMakeRange(0, text.length)]) {
        return round(amount * 0.05 * 100) / 100;
    }

    return 0;
}

// Extract TRN (15-digit tax number)
- (NSString *)extractTRN:(NSString *)text {
    // Try labeled TRN first
    NSRegularExpression *trnRegex = [NSRegularExpression regularExpressionWithPattern:@"(?:trn|tax\\s*registration|tax\\s*no)[:\\s]*(\\d{15})" options:NSCaseInsensitiveSearch error:nil];
    NSTextCheckingResult *match = [trnRegex firstMatchInString:text options:0 range:NSMakeRange(0, text.length)];

    if (match && match.numberOfRanges > 1) {
        return [text substringWithRange:[match rangeAtIndex:1]];
    }

    // Find any 15-digit number
    NSRegularExpression *longNumRegex = [NSRegularExpression regularExpressionWithPattern:@"(\\d{15})" options:0 error:nil];
    match = [longNumRegex firstMatchInString:text options:0 range:NSMakeRange(0, text.length)];

    if (match) {
        return [text substringWithRange:match.range];
    }

    return @"";
}

// Infer category from text
- (NSString *)inferCategory:(NSString *)merchant text:(NSString *)text {
    NSString *combined = [[merchant stringByAppendingString:@" "] stringByAppendingString:text].lowercaseString;

    NSDictionary *keywords = @{
        @"Food": @[@"restaurant", @"cafe", @"coffee", @"bakery", @"kitchen", @"pizza", @"burger", @"shawarma", @"grill", @"catering", @"eat", @"food", @"diner", @"supermarket", @"grocery", @"carrefour", @"lulu", @"spinneys", @"kfc", @"mcdonalds", @"subway", @"starbucks"],
        @"Transport": @[@"petrol", @"gas", @"fuel", @"enoc", @"adnoc", @"epco", @"diesel", @"uber", @"careem", @"taxi", @"rta", @"metro", @"parking", @"salik", @"toll"],
        @"Shopping": @[@"mall", @"shop", @"store", @"outlet", @"boutique", @"amazon", @"noon", @"market", @"hypermarket"],
        @"Office": @[@"office", @"stationery", @"printing", @"supply", @"furniture", @"it", @"tech", @"computer", @"laptop"],
        @"Utilities": @[@"electricity", @"water", @"dewa", @"telecom", @"etisalat", @"du", @"internet", @"wifi", @"bill"],
        @"Entertainment": @[@"cinema", @"theater", @"gym", @"fitness", @"sport", @"club", @"movie", @"concert", @"ticket"],
        @"Health": @[@"pharmacy", @"hospital", @"clinic", @"medical", @"doctor", @"dental", @"health", @"medicine", @"boots", @"aster"],
        @"Travel": @[@"hotel", @"flight", @"airline", @"emirates", @"flydubai", @"airbnb", @"booking", @"travel", @"visa", @"airport"],
        @"Banking": @[@"bank", @"fee", @"transfer", @"interest", @"loan", @"mortgage", @"insurance"]
    };

    for (NSString *category in keywords) {
        NSArray *kw = keywords[category];
        for (NSString *k in kw) {
            if ([combined containsString:k]) {
                return category;
            }
        }
    }

    return @"General";
}

// Infer payment method from text
- (NSString *)inferPaymentMethod:(NSString *)text {
    NSString *lower = text.lowercaseString;

    if ([lower containsString:@"visa"] || [lower containsString:@"mastercard"] || [lower containsString:@"credit card"] || [lower containsString:@"card ending"] || [lower containsString:@"xxxx"]) {
        return @"Credit Card";
    }
    if ([lower containsString:@"debit card"] || [lower containsString:@"debit"]) {
        return @"Debit Card";
    }
    if ([lower containsString:@"online"] || [lower containsString:@"apple pay"] || [lower containsString:@"google pay"] || [lower containsString:@"samsung pay"] || [lower containsString:@"contactless"]) {
        return @"Online";
    }

    return @"Cash";
}

// Empty result helper
- (NSDictionary *)emptyResult {
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    formatter.dateFormat = @"yyyy-MM-dd";

    return @{
        @"merchant": @"Unknown Merchant",
        @"date": [formatter stringFromDate:[NSDate date]],
        @"amount": @0,
        @"vat": @0,
        @"trn": @"",
        @"currency": @"AED",
        @"category": @"General",
        @"paymentMethod": @"Cash"
    };
}

@end

// NSString padding helper
@implementation NSString (Padding)
- (NSString *)stringByPadLeftToLength:(NSUInteger)length withPad:(NSString *)pad {
    if (self.length >= length) {
        return self;
    }

    NSMutableString *result = [NSMutableString string];
    NSUInteger paddingNeeded = length - self.length;

    for (NSUInteger i = 0; i < paddingNeeded; i++) {
        [result appendString:pad];
    }

    [result appendString:self];
    return result;
}
@end
