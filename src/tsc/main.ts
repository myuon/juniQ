import * as PIXI from 'pixi.js';

interface Configurer {
    moc: string;
    texture: string;
    physics: string;
    position?: [number, number];
    scaler?: [number, number];
    size: [number, number];
}

class Mover {
    enabled: boolean;
    offset: [number, number];
    callback: (_: [number, number]) => void;

    constructor(callback: (_: [number,number]) => void) {
        this.callback = callback;
    }

    enable = () => {
        this.enabled = true;
    };

    disable = () => {
        this.enabled = false;
    };

    onMouseDown = (event: MouseEvent) => {
        this.enable();
        this.offset = [event.pageX, event.pageY];
    };

    onMouseMove = (event: MouseEvent) => {
        if (this.enabled) {
            const mover: [number, number] = [event.pageX - this.offset[0], event.pageY - this.offset[1]];
            this.callback(mover);
            this.offset = [event.pageX, event.pageY];
        }
    };

    onMouseUp = (event: MouseEvent) => {
        this.disable();
    };
}

class App {
    app: PIXI.Application;
    model: LIVE2DCUBISMPIXI.Model;
    position: [number, number];
    scaler: [number, number];
    size: [number, number];

    constructor(config: Configurer) {
        this.position = config.position != null ? config.position : [0,0];
        this.scaler = config.scaler != null ? config.scaler : [1.0, 1.0];
        this.size = config.size;

        PIXI.loader
            .add('moc', config.moc, { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BUFFER })
            .add('texture', config.texture)
            .add('physics', config.physics, { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON })
            .load((loader, resources) => {
                this.app = new PIXI.Application(this.size[0], this.size[1], { backgroundColor: 0x1099bb });
                document.body.appendChild(this.app.view);

                let moc = LIVE2DCUBISMCORE.Moc.fromArrayBuffer(resources['moc'].data);

                this.model = new LIVE2DCUBISMPIXI.ModelBuilder()
                    .setMoc(moc)
                    .setTimeScale(1)
                    .addTexture(0, resources['texture'].texture)
                    .setPhysics3Json(resources['physics'].data)
                    .addAnimatorLayer("base", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)
                    .addAnimatorLayer("Motion", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)
                    .addAnimatorLayer("Drag", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)
                    .build();

                this.app.stage.addChild(this.model);
                this.app.stage.addChild(this.model.masks);

                {
                    let orders = [];
                    for (let k in this.model.drawables.ids) {
                        orders.push([this.model.drawables.ids[k], this.model.drawables.renderOrders[k]]);
                    }
                    orders.sort((x,y) => x[1] - y[1]);

                    this.model.removeChildren();
                    for (let [mesh_name, _] of orders) {
                        let mesh = this.model.getModelMeshById(mesh_name);

                        // 余計なmaskを削り取る
                        // 正気か？
                        mesh.mask = null;

                        this.model.addChild(mesh);
                    }
                };

                this.setStageTransform();
                this.onResize();
            }
        );

        window.addEventListener('resize', this.onResize);

        let mover = new Mover((distance: [number, number]) => {
            this.position = [this.position[0] + distance[0], this.position[1] + distance[1]];
            this.setStageTransform();
        });
        window.addEventListener('mousedown', mover.onMouseDown);
        window.addEventListener('mousemove', mover.onMouseMove);
        window.addEventListener('mouseup', mover.onMouseUp);
    }

    setStageTransform = () => {
        this.app.stage.setTransform(this.position[0], this.position[1], this.scaler[0], this.scaler[1], 0, 0, 0, 0, 0);
    }

    onResize = (event: Event = null) => {
        this.app.view.style.width = this.size[0] + "px";
        this.app.view.style.height = this.size[1] + "px";
        this.app.renderer.resize(this.size[0], this.size[1]);

        this.model.position = new PIXI.Point((this.size[0] * 0.5), (this.size[1] * 0.5));
        this.model.scale = new PIXI.Point((this.model.position.x * 0.8), (this.model.position.x * 0.8));
        this.model.masks.resize(this.app.view.width, this.app.view.height);
    };
}

let app = new App({
    size: [1280, 720],
    moc: "../assets/yugure_neko_avatar/suzune_neko_chara_export.moc3",
    texture: "../assets/yugure_neko_avatar/suzune_neko_chara_export.2048/texture_00.png",
    physics: "../assets/yugure_neko_avatar/suzune_neko_chara_export.physics3.json",
    position: [-600, 250],
    scaler: [2.0, 2.0],
});
