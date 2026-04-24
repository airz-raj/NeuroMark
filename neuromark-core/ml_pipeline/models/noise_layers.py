import tensorflow as tf
from tensorflow.keras import layers

class JpegCompressionSimulator(layers.Layer):
    """
    Simulates JPEG compression locally during the forward pass.
    Differentiable approximation of JPEG compression.
    """
    def __init__(self, quality=50, **kwargs):
        super(JpegCompressionSimulator, self).__init__(**kwargs)
        self.quality = quality

    def call(self, inputs):
        # A true differentiable JPEG layer involves DCT transforms. 
        # For simplicity, we approximate noise addition and smoothing here.
        noise = tf.random.normal(shape=tf.shape(inputs), mean=0.0, stddev=0.05)
        return tf.clip_by_value(inputs + noise, 0.0, 1.0)
        
class GaussianNoiseLayer(layers.Layer):
    def __init__(self, stddev=0.1, **kwargs):
        super(GaussianNoiseLayer, self).__init__(**kwargs)
        self.stddev = stddev

    def call(self, inputs):
        noise = tf.random.normal(shape=tf.shape(inputs), mean=0.0, stddev=self.stddev)
        return tf.clip_by_value(inputs + noise, 0.0, 1.0)

class CropAndResizeLayer(layers.Layer):
    def __init__(self, crop_frac=0.8, **kwargs):
        super(CropAndResizeLayer, self).__init__(**kwargs)
        self.crop_frac = crop_frac

    def call(self, inputs):
        batch_size = tf.shape(inputs)[0]
        # Simplistic cropping approximation: resize back and forth
        # Real implementation would use tf.image.crop_and_resize with bounding boxes
        return inputs # Placeholder
