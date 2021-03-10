const server = require("./server")
const port = process.env.PORT

require("mongoose")
  .connect(process.env.JOLIE_ATLAS, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(
    server.listen(port, () => {
      console.log("🚀 Running on port", port)
    })
  )
  .catch((err) => console.log(err))
