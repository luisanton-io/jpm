const { Schema } = require("mongoose")
const mongoose = require("mongoose")

const OrgSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true
    },
    admins: {
      required: true,
      type: Array({
        type: mongoose.Types.ObjectId,
        ref: 'users'
      }),
    }
  }
)

OrgSchema.methods.hasAdmin = async (userId) => {
  return this.admins.find(admin => admin.toString() === userId)
}

const OrgModel = mongoose.model("Org", OrgSchema)

module.exports = OrgModel