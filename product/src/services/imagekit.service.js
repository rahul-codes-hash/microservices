const ImageKit = require("imagekit");
const { randomUUID } = require("crypto");

const ik = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "test_public",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "test_private",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/demo",
});

async function uploadImage(buffer, filename, folder = "/products") {
  try {
    const res = await ik.upload({
      file: buffer,
      fileName: `${randomUUID()}-${filename}`,
      folder,
    });

    return {
      url: res.url,
      thumbnailUrl: res.thumbnailUrl || res.url,
      id: res.fileId,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

module.exports = { ik, uploadImage };
