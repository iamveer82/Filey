#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(PdfTools, RCTEventEmitter)

// Organize & Manage
RCT_EXTERN_METHOD(mergePdfs:(NSArray *)pdfUris
                  filename:(NSString *)filename
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(splitPdf:(NSString *)pdfUri
                  ranges:(NSArray *)ranges
                  filename:(NSString *)filename
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractPages:(NSString *)pdfUri
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deletePages:(NSString *)pdfUri
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(rotatePdf:(NSString *)pdfUri
                  degrees:(NSInteger)degrees
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reversePages:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reorderPages:(NSString *)pdfUri
                  order:(NSArray *)order
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addBlankPage:(NSString *)pdfUri
                  position:(NSInteger)position
                  count:(NSInteger)count
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cropPdf:(NSString *)pdfUri
                  cropBox:(NSDictionary *)cropBox
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(nUpPdf:(NSString *)pdfUri
                  rows:(NSInteger)rows
                  cols:(NSInteger)cols
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(alternateMerge:(NSArray *)pdfUris
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(dividePages:(NSString *)pdfUri
                  rows:(NSInteger)rows
                  cols:(NSInteger)cols
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(combineSinglePage:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPageCount:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPageDimensions:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(viewMetadata:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(editMetadata:(NSString *)pdfUri
                  metadata:(NSDictionary *)metadata
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeMetadata:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToZip:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(comparePdfs:(NSString *)pdfUri1
                  pdfUri2:(NSString *)pdfUri2
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfBooklet:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(posterizePdf:(NSString *)pdfUri
                  rows:(NSInteger)rows
                  cols:(NSInteger)cols
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(gridCombine:(NSArray *)imageUris
                  rows:(NSInteger)rows
                  cols:(NSInteger)cols
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Edit & Annotate
RCT_EXTERN_METHOD(embedSignature:(NSString *)pdfUri
                  signatureUri:(NSString *)signatureUri
                  pageNumber:(NSInteger)pageNumber
                  x:(CGFloat)x y:(CGFloat)y
                  width:(CGFloat)width height:(CGFloat)height
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

RCT_EXTERN_METHOD(addPageNumbers:(NSString *)pdfUri
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addHeaderFooter:(NSString *)pdfUri
                  header:(NSString *)header
                  footer:(NSString *)footer
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addStamp:(NSString *)pdfUri
                  imageUri:(NSString *)imageUri
                  pageNumber:(NSInteger)pageNumber
                  x:(CGFloat)x y:(CGFloat)y
                  width:(CGFloat)width height:(CGFloat)height
                  opacity:(CGFloat)opacity
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeAnnotations:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setBackgroundColor:(NSString *)pdfUri
                  colorHex:(NSString *)colorHex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(invertColors:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeBlankPages:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fillFormField:(NSString *)pdfUri
                  pageNumber:(NSInteger)pageNumber
                  fieldName:(NSString *)fieldName
                  value:(NSString *)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createFormField:(NSString *)pdfUri
                  pageNumber:(NSInteger)pageNumber
                  fieldName:(NSString *)fieldName
                  fieldType:(NSString *)fieldType
                  x:(CGFloat)x y:(CGFloat)y
                  width:(CGFloat)width height:(CGFloat)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeFormFields:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addBookmarks:(NSString *)pdfUri
                  bookmarks:(NSArray *)bookmarks
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Convert
RCT_EXTERN_METHOD(pdfToImages:(NSString *)pdfUri
                  format:(NSString *)format
                  dpi:(NSInteger)dpi
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractImages:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractText:(NSString *)pdfUri
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToGrayscale:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToJson:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToMarkdown:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractTables:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(textToPdf:(NSString *)text
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Secure
RCT_EXTERN_METHOD(protectPdf:(NSString *)pdfUri
                  userPassword:(NSString *)userPassword
                  ownerPassword:(NSString *)ownerPassword
                  filename:(NSString *)filename
                  permissions:(NSDictionary *)permissions
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(decryptPdf:(NSString *)pdfUri
                  password:(NSString *)password
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(sanitizePdf:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(flattenPdf:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(changePermissions:(NSString *)pdfUri
                  permissions:(NSDictionary *)permissions
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(findAndRedact:(NSString *)pdfUri
                  searchText:(NSString *)searchText
                  replaceText:(NSString *)replaceText
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Optimize & Repair
RCT_EXTERN_METHOD(compressPdf:(NSString *)pdfUri
                  quality:(NSString *)quality
                  targetSizeKB:(NSInteger)targetSizeKB
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fixPageSize:(NSString *)pdfUri
                  width:(CGFloat)width
                  height:(CGFloat)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeRestrictions:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(repairPdf:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(rasterizePdf:(NSString *)pdfUri
                  dpi:(NSInteger)dpi
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(linearizePdf:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fontToOutline:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Attachments
RCT_EXTERN_METHOD(addAttachment:(NSString *)pdfUri
                  attachmentUri:(NSString *)attachmentUri
                  name:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractAttachments:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Extended converters
RCT_EXTERN_METHOD(imagesToPdf:(NSArray *)imageUris
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(officeDocToPdf:(NSString *)docUri
                  format:(NSString *)format
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(htmlToPdf:(NSString *)html
                  baseUrl:(NSString *)baseUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(svgToPdf:(NSString *)svgUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToImageFormatEx:(NSString *)pdfUri
                  format:(NSString *)format
                  dpi:(NSInteger)dpi
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToDocx:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToRtf:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToCsv:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToSvg:(NSString *)pdfUri
                  page:(NSInteger)page
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(ocrPdf:(NSString *)pdfUri
                  languages:(NSArray *)languages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deskewPdf:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pdfToPdfA:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getOcgList:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(validateSignature:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(changeTextColor:(NSString *)pdfUri
                  colorHex:(NSString *)colorHex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractEmbeddedImages:(NSString *)pdfUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Archive-backed converters (CBZ, EPUB, XLSX, PPTX, FB2)
RCT_EXTERN_METHOD(cbzToPdf:(NSString *)cbzUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(epubToPdf:(NSString *)epubUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(xlsxToPdf:(NSString *)xlsxUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pptxToPdf:(NSString *)pptxUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fb2ToPdf:(NSString *)fb2Uri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(quickLookToPdf:(NSString *)fileUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// PencilKit / brush ink overlay
RCT_EXTERN_METHOD(applyInkToPage:(NSString *)pdfUri
                  pageNumber:(NSInteger)pageNumber
                  inkPngUri:(NSString *)inkPngUri
                  opacity:(CGFloat)opacity
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(applyInkToPagesBatch:(NSString *)pdfUri
                  pages:(NSArray *)pages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(renderPageToImage:(NSString *)pdfUri
                  page:(NSInteger)page
                  dpi:(NSInteger)dpi
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(signaturePngToPdf:(NSString *)pngUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
