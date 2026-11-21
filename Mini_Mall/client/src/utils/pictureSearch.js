function features(image) {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  const { data } = context.getImageData(0, 0, size, size);
  const colors = new Float32Array(64);
  const light = new Float32Array(size * size);
  const blocks = new Float32Array(64);
  let weight = 0;
  for (let i = 0; i < light.length; i++) {
    const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    light[i] = (r * .299 + g * .587 + b * .114) / 255;
    const contribution = Math.min(r, g, b) > 225 ? .15 : 1;
    colors[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)] += contribution;
    weight += contribution;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const at = y * size + x;
      const edge = (x ? Math.abs(light[at] - light[at - 1]) : 0)
        + (y ? Math.abs(light[at] - light[at - size]) : 0);
      blocks[Math.floor(y / 6) * 8 + Math.floor(x / 6)] += edge / 36;
    }
  }
  return { colors: colors.map((value) => value / weight), blocks };
}

export function imageDistance(left, right) {
  const colorDistance = left.colors.reduce((sum, value, index) => sum + Math.abs(value - right.colors[index]), 0) / 2;
  const shapeDistance = left.blocks.reduce((sum, value, index) => sum + Math.abs(value - right.blocks[index]), 0) / left.blocks.length;
  return colorDistance * .65 + shapeDistance * .35;
}

function imageFrom(url, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const image = new Image();
    const stop = () => {
      cleanup();
      image.removeAttribute('src');
      reject(signal.reason);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', stop);
      image.onload = image.onerror = null;
    };
    const timeout = setTimeout(() => {
      cleanup();
      image.removeAttribute('src');
      reject(new Error('Image took too long to load.'));
    }, 8000);
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error('Could not open the image.')); };
    signal.addEventListener('abort', stop, { once: true });
    image.src = url;
  });
}

async function scoreProduct(product, query, signal) {
  const photo = product.images?.[0];
  if (!photo) return null;
  try {
    const url = new URL(photo, location.origin);
    if (url.origin !== location.origin || url.pathname.endsWith('/placeholder.svg')) return null;
    const image = await imageFrom(url.href, signal);
    return { product, distance: imageDistance(query, features(image)) };
  } catch {
    return null;
  }
}

export async function similarProducts(file, products, signal) {
  const preview = URL.createObjectURL(file);
  try {
    const query = features(await imageFrom(preview, signal));
    const scores = [];
    for (let index = 0; index < products.length; index += 8) {
      signal.throwIfAborted();
      scores.push(...await Promise.all(products.slice(index, index + 8).map((product) => scoreProduct(product, query, signal))));
    }
    signal.throwIfAborted();
    return scores.filter(Boolean).sort((left, right) => left.distance - right.distance)
      .slice(0, 12).map(({ product }) => product);
  } finally {
    URL.revokeObjectURL(preview);
  }
}
