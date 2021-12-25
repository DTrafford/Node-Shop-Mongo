const fs = require("fs");

const deleteFile = (filepath) => {
  fs.unlink(filepath, (err) => {
    if (err) {
      throw err;
    }
  });
};
// DELETE FILE

exports.deleteFile = deleteFile;
