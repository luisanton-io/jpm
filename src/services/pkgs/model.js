const semver = require('semver');
const uniqueValidator = require("mongoose-unique-validator")
const { Schema, model } = require("mongoose")

const FileSchema = new Schema({
    asset_id: String,
    public_id: String,
    created_at: String,
    bytes: Number,
    secure_url: String,
}, { _id: false })

const PkgsSchema = new Schema({
    handle: {
        type: String,
        unique: true,
        required: true
    },
    versions: {
        type: [{
            _id: false,
            file: {
                type: FileSchema,
                required: true
            },
            semantic: {
                type: String,
                validate: async (value) => {
                    if (!semver.valid(value)) throw new Error("Invalid version");
                },
            }
        }],
        required: true,
        validate: async (value) => value.length > 0
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tags: {
        type: [String],
        required: true,
        default: []
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: "Org",
        required: false
    }
})

PkgsSchema.plugin(uniqueValidator)

PkgsSchema.pre('validate', async function (next) {

    // console.log(this)

    const [newVersion, current] = this.versions.slice(0, 2).map(v => v.semantic)

    if (newVersion && current && semver.lte(newVersion, current)) {
        throw new Error("New package version must be higher than the previous ones!")
    }

    next()
})

const PkgsModel = model("pkgs", PkgsSchema)
module.exports = PkgsModel