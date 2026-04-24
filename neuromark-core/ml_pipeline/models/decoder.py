import tensorflow as tf
from tensorflow.keras import layers, Model

def build_decoder(image_shape=(256, 256, 3), message_length=256):
    """
    Builds the Adversarial Autoencoder Decoder model.
    Extracts the 256-bit message from an attacked, watermarked image.
    """
    encoded_image_input = layers.Input(shape=image_shape, name="encoded_image_input")
    
    # Decoding blocks
    x = layers.Conv2D(32, (3, 3), strides=2, padding='same', activation='relu')(encoded_image_input) # 128x128
    x = layers.Conv2D(64, (3, 3), strides=2, padding='same', activation='relu')(x) # 64x64
    x = layers.Conv2D(128, (3, 3), strides=2, padding='same', activation='relu')(x) # 32x32
    x = layers.Conv2D(256, (3, 3), strides=2, padding='same', activation='relu')(x) # 16x16
    
    # Flatten and predict message
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(512, activation='relu')(x)
    
    # Sigmoid to output bit probabilities
    decoded_message = layers.Dense(message_length, activation='sigmoid', name="decoded_message")(x)
    
    return Model(inputs=encoded_image_input, outputs=decoded_message, name="NeuroMark_Decoder")
