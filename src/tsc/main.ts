import * as PIXI from 'pixi.js';

PIXI.loader
    .add('moc', "../assets/yugure_neko_avatar/avater.moc3", { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BUFFER })
    .load((loadercb, resources) => {
        let app = new PIXI.Application(1280, 720, { backgroundColor: 0x1099bb });
        document.body.appendChild(app.view);

        let moc = LIVE2DCUBISMCORE.Moc.fromArrayBuffer(resources['moc'].data);
    });
