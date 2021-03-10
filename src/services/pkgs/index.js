const PkgsModel = require("./model");
const { authorize } = require("../auth")
const router = require("express").Router();
const cloudinary = require('cloudinary').v2
const multer = require('multer');
const tmpDir = 'tmp/'
const upload = multer({ dest: tmpDir })
const fs = require('fs');

const DUMMY_FILE = {
    asset_id: "dummy",
    public_id: "dummy",
    created_at: "dummy",
    bytes: 0,
    secure_url: "dummy.url",
}


router.get("/", async (req, res, next) => {
    const packages = await PkgsModel.find().populate({ path: "author", select: "email -_id" });
    res.send({ packages })
})

router.get("/search/:query", async (req, res, next) => {

    try {
        const { query } = req.params
        const packages = await PkgsModel.find({ $or: [{ "handle": { $regex: query } }, { "tags": { $regex: query } }] })

        res.status(200).send({ packages })
    } catch (error) {
        next(error)
    }
})

router.get("/:handle/:version", async (req, res, next) => {
    try {
        const { handle, version } = req.params
        const package =
            await PkgsModel
                .findOne({ handle })
                .select('-__v')
                .populate({
                    path: "author",
                    select: "email -_id"
                })

        if (!package) {
            const notFound = new Error("Not found")
            notFound.httpStatusCode = 404
            throw notFound
        }



        const packageDoc = Object.assign({}, package._doc)
        packageDoc.version = package.versions.find(v => v.semantic === version)
        delete packageDoc.versions


        if (!packageDoc.version) throw new Error(`Version ${version} not available`)

        res.json(packageDoc)
    } catch (error) {
        next(error)
    }
})

router.get("/:handle", async (req, res, next) => {
    try {
        const { handle } = req.params
        const package =
            await PkgsModel
                .findOne({ handle })
                .select('-__v')
                .populate({
                    path: "author",
                    select: "email -_id"
                })

        if (!package) {
            const notFound = new Error("Not found")
            notFound.httpStatusCode = 404
            throw notFound
        }

        const packageDoc = Object.assign({}, package._doc)
        packageDoc.version = package.versions[0]
        delete packageDoc.versions

        res.json(packageDoc)
    } catch (error) {
        next(error)
    }
})

router.post('/', authorize, upload.single('archive'), async function (req, res, next) {
    try {
        const { handle, version, tags } = JSON.parse(req.body.packageData)
        const newVersion = {
            semantic: version,
            file: DUMMY_FILE
        }

        if (!handle || !version || !req.file) {
            throw new Error("Invalid package data")
        }

        let package = await PkgsModel.findOne({ handle })

        if (!package) {

            package = new PkgsModel({
                handle, tags,
                versions: [newVersion],
                author: req.user._id
            })

            await package.validate()

            res.status(201)
        } else { // the package already exists

            if (package.author._id.toString() !== req.user._id.toString()) {
                // Package must be updated by the same author!
                const error = new Error("Forbidden")
                error.httpStatusCode = 403
                throw error
            }

            package.versions = [newVersion, ...package.versions]
            package.tags = tags

            await package.validate()

            res.status(202)
        }

        cloudinary.uploader.upload(req.file.path,
            {
                resource_type: "raw",
                public_id: `packages/${handle}/${handle}^${version}`,
                overwrite: false
            },
            async function (error, result) {
                if (error) next(error)

                package.versions[0].file = { ...result }

                try {
                    const { handle, versions } = await package.save()
                    const { semantic: version, file } = versions[0]

                    fs.rmdirSync(tmpDir, { recursive: true });
                    fs.mkdirSync(tmpDir)
                    res.send({ handle, version, file })
                } catch (error) {
                    next(error)
                }
            });


    } catch (error) {
        fs.rmdirSync(tmpDir, { recursive: true });
        fs.mkdirSync(tmpDir)
        next(error)
    }
});

router.delete("/:handle", async (req, res, next) => {
    // Deleting ALL packages!!!
    const { handle } = req.params
    console.log(handle)
    try {
        const package = await PkgsModel.findOne({ handle })

        cloudinary.api.delete_resources_by_prefix(`packages/${handle}`, { resource_type: 'raw' }, (error, result) => {
            cloudinary.api.delete_folder(`packages/${handle}`, async (error, result) => {
                await package.remove()
                res.status(202).send({
                    message: `Deleted all instances of '${handle}'. Hopefully this is what you intended to do.`
                })
            })
        })

    } catch (error) {
        next(error)
    }

})

router.delete("/:handle/:version", async (req, res, next) => {
    // Deleting specific version of package

    try {
        const { handle, version } = req.params


        const package = await PkgsModel.findOneAndUpdate({ handle }, {
            $pull: {
                versions: { semantic: version }
            }
        })
        const { public_id } = package.versions.find(v => v.semantic === version).file

        cloudinary.uploader.destroy(public_id, { resource_type: "raw" }, async (error, result) => {
            if (error) throw new Error()

            if (package.versions.length === 1) {
                // remove the whole doc if this was the only version
                await package.remove()
                res.status(202).send({ message: `Deleted '${handle}'. Version ${version} was the only one in DB.` })
            }

            res.status(202).send({ message: `Deleted '${handle}', version ${version}` })
        });


    } catch (error) {
        next(error)
    }

})

module.exports = router