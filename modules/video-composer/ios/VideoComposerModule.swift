import Foundation
import AVFoundation
import UIKit

@objc(VideoComposer)
class VideoComposer: NSObject {

  @objc
  func createVideo(
    _ framePaths: [String],
    outputPath: String,
    fps: NSNumber,
    width: NSNumber,
    height: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        // Validate input
        guard framePaths.count > 0 else {
          DispatchQueue.main.async {
            reject("INVALID_INPUT", "No frames provided", nil)
          }
          return
        }

        // Create video in temporary directory first (guaranteed writable by AVAssetWriter)
        let tempDir = NSTemporaryDirectory()
        let tempFilename = "temp_video_\(UUID().uuidString).mp4"
        let tempPath = (tempDir as NSString).appendingPathComponent(tempFilename)
        let tempURL = URL(fileURLWithPath: tempPath)

        // Remove temp file if it exists
        if FileManager.default.fileExists(atPath: tempPath) {
          try FileManager.default.removeItem(at: tempURL)
        }

        // Round dimensions to nearest multiple of 16 for proper encoding
        let videoWidth = Int(truncating: width)
        let videoHeight = Int(truncating: height)
        let adjustedWidth = (videoWidth + 15) & ~15  // Round up to multiple of 16
        let adjustedHeight = (videoHeight + 15) & ~15


        // Pre-validate all frames before starting video creation
        var validFrames: [(path: String, index: Int)] = []
        for (index, framePath) in framePaths.enumerated() {
          let fileExists = FileManager.default.fileExists(atPath: framePath)
          if fileExists {
            if let testImage = UIImage(contentsOfFile: framePath) {
              validFrames.append((path: framePath, index: index))
            } else {
            }
          } else {
          }
        }

        guard validFrames.count > 0 else {
          DispatchQueue.main.async {
            reject("NO_VALID_FRAMES", "No valid frames found to create video (0/\(framePaths.count))", nil)
          }
          return
        }

        if validFrames.count < framePaths.count {
        }

        // Create video writer with temp URL
        let videoWriter = try AVAssetWriter(url: tempURL, fileType: .mp4)

        let videoSettings: [String: Any] = [
          AVVideoCodecKey: AVVideoCodecType.h264,
          AVVideoWidthKey: adjustedWidth,
          AVVideoHeightKey: adjustedHeight,
          AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: adjustedWidth * adjustedHeight * 4,
            AVVideoExpectedSourceFrameRateKey: fps,
            AVVideoMaxKeyFrameIntervalKey: 30
          ]
        ]

        let videoWriterInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoWriterInput.expectsMediaDataInRealTime = false

        let pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
          assetWriterInput: videoWriterInput,
          sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
            kCVPixelBufferWidthKey as String: adjustedWidth,
            kCVPixelBufferHeightKey as String: adjustedHeight
          ]
        )

        guard videoWriter.canAdd(videoWriterInput) else {
          DispatchQueue.main.async {
            reject("INVALID_INPUT", "Cannot add video input to writer", nil)
          }
          return
        }

        videoWriter.add(videoWriterInput)

        guard videoWriter.startWriting() else {
          DispatchQueue.main.async {
            let error = videoWriter.error?.localizedDescription ?? "Unknown error"
            reject("START_WRITING_FAILED", "Failed to start writing: \(error)", videoWriter.error)
          }
          return
        }

        videoWriter.startSession(atSourceTime: .zero)

        let frameDuration = CMTime(value: 1, timescale: CMTimeScale(truncating: fps))
        var successfulFrames = 0
        var failedFrames = 0

        // Use validFrames instead of framePaths
        for (frameInfo) in validFrames {
          autoreleasepool {
            let originalIndex = frameInfo.index
            let framePath = frameInfo.path

            guard let image = UIImage(contentsOfFile: framePath) else {
              failedFrames += 1
              return
            }


            // Wait for input to be ready with longer timeout
            var attempts = 0
            while !videoWriterInput.isReadyForMoreMediaData && attempts < 200 {
              Thread.sleep(forTimeInterval: 0.01)
              attempts += 1
            }

            if !videoWriterInput.isReadyForMoreMediaData {
              failedFrames += 1
              return
            }

            // Use successfulFrames for timing to ensure consistent frame duration
            let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(successfulFrames))

            if let pixelBuffer = self.pixelBuffer(from: image, size: CGSize(width: adjustedWidth, height: adjustedHeight)) {
              let success = pixelBufferAdaptor.append(pixelBuffer, withPresentationTime: presentationTime)
              if success {
                successfulFrames += 1
              } else {
                failedFrames += 1
              }
            } else {
              failedFrames += 1
            }
          }
        }


        // Ensure we have at least some frames
        guard successfulFrames > 0 else {
          videoWriter.cancelWriting()
          DispatchQueue.main.async {
            reject("NO_FRAMES_APPENDED", "Failed to append any frames to video", nil)
          }
          return
        }

        videoWriterInput.markAsFinished()
        videoWriter.finishWriting {
          if videoWriter.status == .completed {

            // Try to copy to final location, but if it fails (e.g., simulator read-only), just use temp
            do {
              let finalURL = URL(fileURLWithPath: outputPath)
              let finalParentDir = finalURL.deletingLastPathComponent()

              // Ensure final directory exists
              if !FileManager.default.fileExists(atPath: finalParentDir.path) {
                try FileManager.default.createDirectory(at: finalParentDir, withIntermediateDirectories: true, attributes: nil)
              }

              // Remove existing file if present
              if FileManager.default.fileExists(atPath: outputPath) {
                try FileManager.default.removeItem(at: finalURL)
              }

              // Copy from temp to final location
              try FileManager.default.copyItem(at: tempURL, to: finalURL)

              // Clean up temp file
              try FileManager.default.removeItem(at: tempURL)

              DispatchQueue.main.async {
                resolve(outputPath)
              }
            } catch {
              // Copy failed (probably simulator read-only issue) - just return temp path
              DispatchQueue.main.async {
                resolve(tempPath)  // Return temp path - sharing will still work
              }
            }
          } else {
            let errorMsg = videoWriter.error?.localizedDescription ?? "Unknown error"
            DispatchQueue.main.async {
              reject("VIDEO_CREATION_FAILED", "Failed to create video: \(errorMsg)", videoWriter.error)
            }
          }
        }

      } catch {
        DispatchQueue.main.async {
          reject("VIDEO_CREATION_ERROR", error.localizedDescription, error)
        }
      }
    }
  }

  private func pixelBuffer(from image: UIImage, size: CGSize) -> CVPixelBuffer? {
    let attrs = [
      kCVPixelBufferCGImageCompatibilityKey: kCFBooleanTrue!,
      kCVPixelBufferCGBitmapContextCompatibilityKey: kCFBooleanTrue!,
      kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary
    ] as CFDictionary

    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      Int(size.width),
      Int(size.height),
      kCVPixelFormatType_32ARGB,
      attrs,
      &pixelBuffer
    )

    guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
      return nil
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

    let context = CGContext(
      data: CVPixelBufferGetBaseAddress(buffer),
      width: Int(size.width),
      height: Int(size.height),
      bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    )

    guard let ctx = context, let cgImage = image.cgImage else {
      return nil
    }

    // Calculate scaling to fit image within video dimensions while maintaining aspect ratio
    let imageSize = image.size
    let scale = min(size.width / imageSize.width, size.height / imageSize.height)
    let scaledWidth = imageSize.width * scale
    let scaledHeight = imageSize.height * scale
    let xOffset = (size.width - scaledWidth) / 2
    let yOffset = (size.height - scaledHeight) / 2

    // Fill background with black
    ctx.setFillColor(UIColor.black.cgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: size.width, height: size.height))

    // Draw scaled image centered
    ctx.draw(cgImage, in: CGRect(x: xOffset, y: yOffset, width: scaledWidth, height: scaledHeight))

    return buffer
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
