import * as PIXI from 'pixi.js';

const WIDTH = 1280;
const HEIGHT = 720;

PIXI.loader
    .add('moc', "../assets/yugure_neko_avatar/suzune_neko_chara_export.moc3", { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BUFFER })
    .add('texture', "../assets/yugure_neko_avatar/suzune_neko_chara_export.2048/texture_00.png")
    .add('physics', "../assets/yugure_neko_avatar/suzune_neko_chara_export.physics3.json", { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON })
    .load((loader, resources) => {
        let app = new PIXI.Application(WIDTH, HEIGHT, { backgroundColor: 0x1099bb });
        document.body.appendChild(app.view);

        let moc = LIVE2DCUBISMCORE.Moc.fromArrayBuffer(resources['moc'].data);

        let model = new LIVE2DCUBISMPIXI.ModelBuilder()
            .setMoc(moc)
            .setTimeScale(1)
            .addTexture(0, resources['texture'].texture)
            .setPhysics3Json(resources['physics'].data)
            .addAnimatorLayer("base", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)
            .addAnimatorLayer("Motion", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)
            .addAnimatorLayer("Drag", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)
            .build();

        app.stage.addChild(model);
        app.stage.addChild(model.masks);
        app.stage.setTransform(0, 100, 1, 1, 0, 0, 0, 0, 0);

        const reorder = function() {
            let orders = [];
            for (let k in model.drawables.ids) {
                orders.push([model.drawables.ids[k], model.drawables.renderOrders[k]]);
            }
            orders.sort((x,y) => x[1] - y[1]);

            model.removeChildren();
            for (let [mesh_name, _] of orders) {
                let mesh = model.getModelMeshById(mesh_name);

                // 余計なmaskを削り取る
                // 正気か？
                mesh.mask = null;

                model.addChild(mesh);
            }
        };
        reorder();

        const onResize = function (event: any = null) {
            app.view.style.width = WIDTH + "px";
            app.view.style.height = HEIGHT + "px";
            app.renderer.resize(WIDTH, HEIGHT);

            model.position = new PIXI.Point((WIDTH * 0.5), (HEIGHT * 0.5));
            model.scale = new PIXI.Point((model.position.x * 0.8), (model.position.x * 0.8));
            model.masks.resize(app.view.width, app.view.height);
        };
        onResize();
        window.addEventListener('resize', onResize);

        let pos_x = 0.0;
        let pos_y = 0.0;

        const onDragEnd = (event: any) => {
            pos_x = 0.0;
            pos_y = 0.0;
        }

        const onDragMove = (event: any) => {
            const mouse_x = model.position.x - event.offsetX;
            const mouse_y = model.position.y - event.offsetY;

            // Normalization => mouse coordinates from -1.0 to 1.0
            let height = app.screen.height / 2;
            let width = app.screen.width / 2;
            let scale = 1.0 - (height / model.scale.y);
            pos_x = - mouse_x / height;
            // posY coordinate adjust head position
            pos_y = - (mouse_y / width) + scale;
        }

        app.view.addEventListener('pointerup', onDragEnd, false);
        app.view.addEventListener('pointerout', onDragEnd, false);
        app.view.addEventListener('pointermove', onDragMove, false);
    });
