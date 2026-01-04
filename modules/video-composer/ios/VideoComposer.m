#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VideoComposer, NSObject)

RCT_EXTERN_METHOD(createVideo:(NSArray *)framePaths
                  outputPath:(NSString *)outputPath
                  fps:(nonnull NSNumber *)fps
                  width:(nonnull NSNumber *)width
                  height:(nonnull NSNumber *)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
