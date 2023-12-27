const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.50cmhcw.mongodb.net/shop?retryWrites=true&w=majority`;
module.exports = uri;
