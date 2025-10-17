import { Adapter } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import { tmq as files } from "../../common/static_codegen/tmq/files";
import { FilesCollection } from "../classes/dbTemplates/Files";
import { rawObjectId } from "../classes/db/helper";
import Server from "../Server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/FilesService.js' });

const { FetchFilesResponse, FileItem } = files;

export default {
    FetchFiles: async function ({ request }, callback) {
        const response = new FetchFilesResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({ code: 500, message: "Server instance not initialized!", status: status.INTERNAL });
                return;
            }

            const businessId = request.business_id || request.businessId;
            if (!businessId) {
                response.success = false;
                response.error_message = 'missing_business_id';
                response.total_count = 0;
                response.files = [];
                response.last_basis = 0;
                callback(null, response);
                return;
            }

            // Pagination
            const page = request.page || {};
            const lastBasis = Number(page.last_basis ?? page.lastBasis ?? request.last_basis ?? request.lastBasis ?? 0);
            const limit = Math.max(1, Number(page.limit ?? request.limit ?? 50));
            const query = { businessId: new rawObjectId(businessId), deletedAt: { $exists: false } };
            if (lastBasis > 0) query.createdAt = { $lt: lastBasis };

            const docs = await FilesCollection.rawCollection()
                .find(query, { sort: { createdAt: -1 }, limit })
                .toArray();

            response.success = true;
            response.error_message = '';
            response.total_count = docs.length;
            response.files = docs.map((d) => {
                const item = new FileItem();
                item.id = d._id?.toString?.() || String(d._id);
                item.file_id = d.fileId || '';
                item.business_id = d.businessId?.toString?.() || String(d.businessId || '');
                item.user_id = d.userId?.toString?.() || String(d.userId || '');
                item.original_name = d.originalName || '';
                item.file_size = Number(d.fileSize || 0);
                // Optional mirrors
                if (item.mime_type !== undefined) item.mime_type = d.mimeType || '';
                if (item.status !== undefined) item.status = d.status || '';
                if (item.kb_status !== undefined) item.kb_status = d.kbStatus || '';
                item.created_at = Number(d.createdAt || 0);
                return item;
            });
            response.last_basis = docs.length ? Number(docs[docs.length - 1].createdAt || 0) : 0;
            callback(null, response);
        } catch (error) {
            logger.error('FetchFiles error', { error: error?.message || error });
            callback({ code: 500, message: error.message || "Error fetching files", status: status.INTERNAL });
        }
    },
    /**
     * Soft-delete a file by fileId by setting deletedAt, and emit RedisVent remove
     */
    DeleteFile: async function ({ request }, callback) {
        try {
            const fileId = request.file_id || request.fileId;
            if (!fileId || typeof fileId !== 'string') {
                callback(null, { success: false, error_message: 'missing_file_id' });
                return;
            }

            // Find the file to get routing info
            const rawCol = FilesCollection.rawCollection();
            const existing = await rawCol.findOne({ fileId });

            if (existing) {
                // Soft-delete
                await rawCol.updateOne({ _id: existing._id }, { $set: { deletedAt: Date.now() } });

                // RedisVent remove event (route by businessId)
                try {
                    const bizId = existing.businessId?.toString?.() || String(existing.businessId || '');
                    if (bizId) {
                        Server.RedisVentServer.triggers.remove('fileapp', 'file', bizId, fileId);
                    }
                } catch (_) { }
            }

            // Idempotent success even if not found
            callback(null, { success: true, error_message: '' });
        } catch (error) {
            logger.error('DeleteFile error', { error: error?.message || error });
            callback({ code: 500, message: error.message || 'Error deleting file', status: status.INTERNAL });
        }
    }
};


