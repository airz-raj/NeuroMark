import tensorflow as tf
from tensorflow.keras import layers, Model

def build_encoder(image_shape=(256, 256, 3), message_shape=(256,)):
    """
    Builds the Adversarial Autoencoder Encoder model.
    Takes an image and a 256-bit message, and encodes the message into the image invisibly.
    """
    # Image Input
    image_input = layers.Input(shape=image_shape, name="image_input")
    
    # Message Input
    message_input = layers.Input(shape=message_shape, name="message_input")
    
    # Broadcast message to match image spatial dimensions roughly
    # For a 256x256 image, we might expand the message
    x_msg = layers.Dense(16 * 16 * 32, activation='relu')(message_input)
    x_msg = layers.Reshape((16, 16, 32))(x_msg)
    x_msg = layers.UpSampling2D(size=(16, 16))(x_msg) # Now 256x256x32
    
    # Conv features for image
    x_img = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(image_input)
    x_img = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(x_img)
    
    # Concatenate features
    x = layers.Concatenate()([x_img, x_msg])
    
    # Encoding blocks
    x = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(x)
    x = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(x)
    
    # Final projection to image space (3 channels for RGB)
    # Output needs to be a residual or the direct image
    output_image = layers.Conv2D(3, (3, 3), padding='same', activation='sigmoid', name="encoded_image")(x)
    
    return Model(inputs=[image_input, message_input], outputs=output_image, name="NeuroMark_Encoder")
