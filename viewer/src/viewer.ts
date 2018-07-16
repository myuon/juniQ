interface Configurer {
    moc: string;
    texture: string;
    physics: string;
    empty_motion: string;
    position?: [number, number];
    scaler?: [number, number];
    size: [number, number];
}

interface ModelParameter {
    id: string,
    default: number,
    min: number,
    max: number,
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
    empty_animation: LIVE2DCUBISMFRAMEWORK.Animation;

    constructor(config: Configurer) {
        this.position = config.position != null ? config.position : [0,0];
        this.scaler = config.scaler != null ? config.scaler : [1.0, 1.0];
        this.size = config.size;

        PIXI.loader
            .add('moc', config.moc, { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BUFFER, crossOrigin: true })
            .add('texture', config.texture, { crossOrigin: true })
            .add('physics', config.physics, { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON, crossOrigin: true })
            .add('empty_motion', config.empty_motion, { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON, crossOrigin: true })
            .load((loader: PIXI.loaders.Loader, resources: PIXI.loaders.ResourceDictionary) => {
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

                this.empty_animation = LIVE2DCUBISMFRAMEWORK.Animation.fromMotion3Json(resources['empty_motion'].data);
                this.empty_animation.evaluate = (time: any, weight: any, blend: any, target: any) => {
                };
                this.model.animator.getLayer('base').play(this.empty_animation);

                this.app.ticker.add((deltaTime) => {
                    this.model.update(deltaTime);
                    this.model.masks.update(this.app.renderer);
                });

                this.processModel();
                this.setStageTransform();
                this.onResize();

                this.sendToParent();
            }
        );

        // resize
        window.addEventListener('resize', this.onResize);

        // move event handling
        let mover = new Mover((distance: [number, number]) => {
            this.position = [this.position[0] + distance[0], this.position[1] + distance[1]];
            this.setStageTransform();
        });
        window.addEventListener('mousedown', mover.onMouseDown);
        window.addEventListener('mousemove', mover.onMouseMove);
        window.addEventListener('mouseup', mover.onMouseUp);

        // scale up/down event handling
        window.addEventListener('wheel', (event: WheelEvent) => {
            let coeff = (event.deltaY > 0 ? -1 : 1) * 0.1;
            this.scaler = [this.scaler[0] + coeff, this.scaler[1] + coeff];
            this.setStageTransform();
        });
    }

    // この辺の処理が必要なのはSDKのバグなのかそれとも仕様なのか…
    processModel = () => {
        let orders: [string, number][] = [];
        for (let k in this.model.drawables.ids) {
            orders.push([this.model.drawables.ids[k], this.model.drawables.renderOrders[k]]);
        }
        orders.sort((x:[string, number], y: [string, number]) => x[1] - y[1]);

        this.model.removeChildren();
        for (let [mesh_name, _] of orders) {
            let mesh = this.model.getModelMeshById(mesh_name);
            this.model.addChild(mesh);
        }
    };

    setStageTransform = () => {
        this.app.stage.setTransform(this.position[0], this.position[1], this.scaler[0], this.scaler[1], 0, 0, 0, this.size[0] / 2, this.size[1] / 2);
    };

    onResize = (event: Event = null) => {
        this.app.view.style.width = this.size[0] + "px";
        this.app.view.style.height = this.size[1] + "px";
        this.app.renderer.resize(this.size[0], this.size[1]);

        this.model.position = new PIXI.Point((this.size[0] * 0.5), (this.size[1] * 0.5));
        this.model.scale = new PIXI.Point(this.model.position.x, this.model.position.x);
        this.model.masks.resize(this.app.view.width, this.app.view.height);
    };

    sendToParent = () => {
        let parameters: ModelParameter[] = [];
        for (let i in this.model.parameters.ids) {
            parameters.push({
                id: this.model.parameters.ids[i],
                default: this.model.parameters.defaultValues[i],
                min: this.model.parameters.minimumValues[i],
                max: this.model.parameters.maximumValues[i],
            });
        }

        let object = {
            size: this.size,
            parameters: parameters,
        };

        window.parent.postMessage(object, "*");
    };

    animateByParams = (params: {[key:string]: string}) => {
        if (this.empty_animation === undefined || this.empty_animation === null) return;

        this.empty_animation.evaluate = (time: any, weight: any, blend: any, target: any) => {
            Object.keys(params).forEach((key) => {
                let parameter_name = target.parameters.ids.indexOf(key);
                target.parameters.values[parameter_name] = parseInt(params[key], 10);
            });
        };
    };
}

let app = new App({
    size: [1024, 720],
    moc: "assets/yugure_neko_avatar/suzune_neko_chara_export.moc3",
    texture: "assets/yugure_neko_avatar/suzune_neko_chara_export.2048/texture_00.png",
    physics: "assets/yugure_neko_avatar/suzune_neko_chara_export.physics3.json",
    empty_motion: "assets/empty_motion.json",
    position: [512, 720],
    scaler: [1.5, 1.5],
});

let socket = io('http://localhost:3000');
socket.on('animate-by-params', (params: {[key: string]: string}) => {
    console.log(params);
    app.animateByParams(params);
});
