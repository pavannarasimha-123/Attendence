import { Html5Qrcode } from 'html5-qrcode';

class ScannerService {
    instance = null;
    currentElementId = null;
    busyPromise = Promise.resolve();

    async runSafe(fn) {
        this.busyPromise = this.busyPromise.then(async () => {
            try {
                await fn();
            } catch (e) {
                console.error("ScannerService: Operation failed", e);
            }
        });
        return this.busyPromise;
    }

    getInstance(elementId) {
        // If the element ID changes, we MUST destroy the old instance and create a new one
        if (this.instance && this.currentElementId !== elementId) {
            try {
                this.instance.clear();
            } catch (e) { }
            this.instance = null;
        }

        if (!this.instance) {
            this.instance = new Html5Qrcode(elementId);
            this.currentElementId = elementId;
        }
        return this.instance;
    }

    getState() {
        return this.instance ? this.instance.getState() : 1;
    }

    async startSafe(elementId, cameraIdOrConfig, config, successCallback, errorCallback) {
        await this.runSafe(async () => {
            const scanner = this.getInstance(elementId);
            if (scanner.getState() === 1) { // IDLE
                await scanner.start(cameraIdOrConfig, config, successCallback, errorCallback);
            }
        });
    }

    async stopSafe() {
        await this.runSafe(async () => {
            if (this.instance && this.instance.getState() >= 2) {
                await this.instance.stop();
            }
        });
    }

    async clearSafe() {
        await this.runSafe(async () => {
            if (this.instance) {
                if (this.instance.getState() >= 2) {
                    await this.instance.stop();
                }
                if (this.instance.getState() === 1) {
                    this.instance.clear();
                    this.instance = null;
                    this.currentElementId = null;
                }
            }
        });
    }
}

const scannerService = new ScannerService();
export default scannerService;
