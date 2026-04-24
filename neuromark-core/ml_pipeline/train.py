import tensorflow as tf
import os
import argparse
from loguru import logger
from models.encoder import build_encoder
from models.decoder import build_decoder

def parse_args():
    parser = argparse.ArgumentParser(description="NeuroMark Adversarial Training Pipeline")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Training batch size")
    parser.add_argument("--log-dir", type=str, default="./logs", help="TensorBoard log directory")
    return parser.parse_args()

def get_dummy_dataset(batch_size):
    """Creates a dummy tf.data.Dataset for demonstration."""
    logger.info("Initializing high-throughput tf.data pipeline...")
    
    # Use float32 and scale to [0, 1]
    images = tf.random.uniform((100, 256, 256, 3), 0, 1.0, dtype=tf.float32)
    # 256-bit message vector
    messages = tf.random.uniform((100, 256), 0, 2, dtype=tf.int32)
    messages = tf.cast(messages, tf.float32)

    dataset = tf.data.Dataset.from_tensor_slices((images, messages))
    dataset = dataset.shuffle(100).batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return dataset

def loss_fn(original_images, encoded_images, original_messages, decoded_messages):
    # Image Reconstruction Loss (L2 / MSE)
    image_loss = tf.reduce_mean(tf.square(original_images - encoded_images))
    
    # Message Recovery Loss (Binary Crossentropy)
    bce = tf.keras.losses.BinaryCrossentropy()
    message_loss = bce(original_messages, decoded_messages)
    
    return image_loss + (2.0 * message_loss), image_loss, message_loss

@tf.function
def train_step(encoder, decoder, optimizer, images, messages, train_loss, img_loss_metric, msg_loss_metric):
    with tf.GradientTape() as tape:
        encoded_images = encoder([images, messages], training=True)
        # Typically noise_layer(encoded_images) would go here
        decoded_messages = decoder(encoded_images, training=True)
        
        loss, img_loss, msg_loss = loss_fn(images, encoded_images, messages, decoded_messages)
        
    gradients = tape.gradient(loss, encoder.trainable_variables + decoder.trainable_variables)
    optimizer.apply_gradients(zip(gradients, encoder.trainable_variables + decoder.trainable_variables))
    
    train_loss(loss)
    img_loss_metric(img_loss)
    msg_loss_metric(msg_loss)

def train(args):
    logger.info("🚀 Bootstrapping NeuroMark Google Vertex AI Training Pipeline")
    
    # Setup ML Strategy (MirroredStrategy for multi-GPU/TPU)
    strategy = tf.distribute.MirroredStrategy()
    logger.info(f"Number of devices in distributed strategy: {strategy.num_replicas_in_sync}")

    dataset = get_dummy_dataset(args.batch_size)

    with strategy.scope():
        encoder = build_encoder()
        decoder = build_decoder()
        optimizer = tf.keras.optimizers.Adam(learning_rate=1e-4)
        
        train_loss = tf.keras.metrics.Mean('train_loss', dtype=tf.float32)
        img_loss_metric = tf.keras.metrics.Mean('image_loss', dtype=tf.float32)
        msg_loss_metric = tf.keras.metrics.Mean('message_loss', dtype=tf.float32)

    # TensorBoard setup
    os.makedirs(args.log_dir, exist_ok=True)
    summary_writer = tf.summary.create_file_writer(args.log_dir)

    # Custom Training Loop
    for epoch in range(args.epochs):
        logger.info(f"Epoch {epoch+1}/{args.epochs}")
        for step, (images, messages) in enumerate(dataset):
            train_step(encoder, decoder, optimizer, images, messages, train_loss, img_loss_metric, msg_loss_metric)
            
            if step % 2 == 0:
                logger.debug(f"Step {step}: Loss = {train_loss.result():.4f} (Img: {img_loss_metric.result():.4f}, Msg: {msg_loss_metric.result():.4f})")
        
        # Write metrics to TensorBoard
        with summary_writer.as_default():
            tf.summary.scalar('total_loss', train_loss.result(), step=epoch)
            tf.summary.scalar('image_loss', img_loss_metric.result(), step=epoch)
            tf.summary.scalar('message_loss', msg_loss_metric.result(), step=epoch)

        train_loss.reset_states()
        img_loss_metric.reset_states()
        msg_loss_metric.reset_states()

    # Save format for Google Cloud Platform serving
    logger.info("✅ Training complete. Exporting SavedModel format for Vertex AI Endpoints.")
    encoder.save("models/saved_model/encoder", save_format="tf")
    decoder.save("models/saved_model/decoder", save_format="tf")

if __name__ == "__main__":
    args = parse_args()
    train(args)
