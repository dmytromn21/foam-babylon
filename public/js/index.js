window.addEventListener('DOMContentLoaded', function () {
     eps = 0.05
     var undo = [];
     var redo = [];
     var uniqueIDRef;
     var resultMesh;
     let statehash = {
          "id": 0,
          "m": new BABYLON.Matrix.Identity(),
          "mprev": new BABYLON.Matrix.Identity(),
          "dirty": false
      }
      let rotateHash = {
          "id": 0,
          "m": new BABYLON.Matrix.Identity(),
          "mprev": new BABYLON.Matrix.Identity(),
          "dirty": false
      }

     var basePath = "http://localhost:3000/";
     var oldx, oldy;
     var selectionMesh = null;
     let lock = true;
     var canvas = document.getElementById('canvas');
    
     var engine = new BABYLON.Engine(canvas, true);
     var scene = new BABYLON.Scene(engine);
     var poly, gizmo, gizmoRot, gizmoScale, axisScaleGizmo;
     
     let activeLine;
     let activeShape;
     //let drawCanvas, canvasFabric;
     let lineArray = [];
     let pointArray = [];
     let drawMode = true;

     let meshDepthGUI;
     let depthInputText, textMeshDepth; 

     //Edit Polygon start
     const drawCanvas = document.getElementById("drawCanvas");
     const ctxDrawCanvas = drawCanvas.getContext("2d");
     let scale = 1.0;
     let transformDeltaX = 0;
     let transformDeltaY = 0;
     let contourPointsData = [];
     let pixelEpsilon = 10;
     var points = []; // array of {x, y} objects
     let mouseX, mouseY; // mouse position
     let distance = 10; // distance threshold in pixels
     let lastIdx = -1;
     var pixelHash = {}
     let mousedn = false;

     let allStates = {
     NOOP: "NOOP",
     DRAW: "draw",
     COMPLETE: "complete",
     EDIT: "edit"
     } // polygon completion
     let state = allStates.NOOP;

     var lastMousePos = {
     x: -1,
     y: -1
     };

     let isCanvasEventListener = false;

     // background of contoured image canvas
     let backgroundWidth, backgroundHeight;

     //End

     var initialiseBabylon = function(){
          scene = createScene();
          engine.runRenderLoop(function() {
               scene.render();
          });
     }
     var loadExistingBabylon = function(){
          var foamPositionsNew = foam.getVerticesData(BABYLON.VertexBuffer.PositionKind);
          // Create the scene space
          scene.clearColor = new BABYLON.Color3(1, 1, 1);
          createDimensionLinesAndInputs(foamPositionsNew);
          gizmo = new BABYLON.GizmoManager(scene); //new BABYLON.PlaneRotationGizmo (new BABYLON.Vector3(0,1,0), BABYLON.Color3.FromHexString("#00b894"), utilLayer);
     gizmo.usePointerToAttachGizmos = false;
     gizmo.boundingBoxGizmoEnabled = true;
     gizmo.boundingBoxDragBehavior.disableMovement = true;

     // gizmoRot = new BABYLON.PlaneRotationGizmo (new BABYLON.Vector3(0,1,0), BABYLON.Color3.FromHexString("#00b894"), utilLayer);

          
     }

     var camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 10, new BABYLON.Vector3(0, 0, 0), scene);
     camera.angularSensibilityY *= 4;
     camera.angularSensibilityX *= 4;
     camera.wheelDeltaPercentage = 0.0;
     camera.setPosition(new BABYLON.Vector3(0, 280, 0));
     camera.attachControl(canvas, true);
     camera.setTarget(BABYLON.Vector3.Zero());
     camera.lowerRadiusLimit = camera.radius-40;
     camera.upperRadiusLimit = camera.radius+40;
     camera.panningSensibility = 0
   
     // ORTHOCAM
     var cameraOrtho = new BABYLON.ArcRotateCamera("camera2", 0, 0, 10, new BABYLON.Vector3(0, 0, 0), scene);
     cameraOrtho.angularSensibilityY *= 4;
     cameraOrtho.angularSensibilityX *= 4;
     cameraOrtho.wheelDeltaPercentage = 0.0;
     cameraOrtho.inputs.attached.pointers.buttons = [2];
     cameraOrtho.setPosition(new BABYLON.Vector3(0, 250, 0));
     cameraOrtho.attachControl(canvas, true);
     cameraOrtho.setTarget(BABYLON.Vector3.Zero());
     cameraOrtho.attachControl(canvas, false);
     cameraOrtho.mode = cameraOrtho.ORTHOGRAPHIC_CAMERA;
     cameraOrtho.inputs.attached.mousewheel.detachControl(canvas)


     const rect   = engine.getRenderingCanvasClientRect();
     const aspect = rect.height / rect.width; 
     cameraOrtho.orthoLeft   = -cameraOrtho.radius + 10;
     cameraOrtho.orthoRight  =  cameraOrtho.radius + 10;
     cameraOrtho.orthoBottom = -cameraOrtho.radius * aspect+ 10;
     cameraOrtho.orthoTop    =  cameraOrtho.radius * aspect+ 10;   
     cameraOrtho.applyVerticalCorrection();
     var pointerDragBehavior_z = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 1, 0) });
     pointerDragBehavior_z.useObjectOrientationForDragging = false;
     pointerDragBehavior_z.onDragStartObservable.add((event)=>{
          let mat_ = event.pointerInfo.pickInfo.pickedMesh.getWorldMatrix();
          let savedMat = createMat(mat_);
          statehash.id = event.pointerInfo.pickInfo.pickedMesh.uniqueId;
          statehash.mprev = savedMat;
  
      });
      pointerDragBehavior_z.onDragEndObservable.add((event)=>{
          let mat_ = event.pointerInfo.pickInfo.pickedMesh.getWorldMatrix();
          let currentMat = createMat(mat_);
          statehash.m = currentMat;
          undo.push({...statehash})
          console.log(undo);
      });
  
  
     // debug sphere
     // var sph1 = BABYLON.MeshBuilder.CreateSphere("sphere", {radius: 2}, scene);
     // var sph2 = BABYLON.MeshBuilder.CreateSphere("sphere2", {radius: 2}, scene);
     // var sph3 = BABYLON.MeshBuilder.CreateSphere("sphere2", {radius: 2}, scene);
     // var sph4 = BABYLON.MeshBuilder.CreateSphere("sphere2", {radius: 2}, scene);
     var utilLayer = new BABYLON.UtilityLayerRenderer(scene);
     gizmoRot = new BABYLON.PlaneRotationGizmo (new BABYLON.Vector3(0,1,0), BABYLON.Color3.FromHexString("#00b894"), utilLayer);
     gizmoRot.updateGizmoRotationToMatchAttachedMesh = false;
     gizmoRot.updateGizmoPositionToMatchAttachedMesh = true;
     gizmoRot.dragBehavior.onDragStartObservable.add((event) => {
          let mockid = uniqueIDRef
          let mat_ = scene.getMeshByUniqueId(mockid).getWorldMatrix();
          let savedMat = createMat(mat_);
          rotateHash.id = mockid;
          rotateHash.mprev = savedMat;
      });
  
      gizmoRot.dragBehavior.onDragEndObservable.add((event) => {
          let mockid = uniqueIDRef
          let mat_ =  scene.getMeshByUniqueId(mockid).getWorldMatrix();
          let currentMat = createMat(mat_);
          rotateHash.m = currentMat;
          if(undo.length > 0 && redo.length > 0){
              redo = []
          }
          undo.push({...rotateHash})
          console.log(undo)
      });

     //configuration of the scaling gizmo for the meshes
     gizmoScale = new BABYLON.ScaleGizmo(utilLayer, 1, gizmo)
     gizmoScale.updateGizmoPositionToMatchAttachedMesh = true;
     gizmoScale.updateGizmoRotationToMatchAttachedMesh = true;
     gizmoScale.yGizmo.isEnabled = false;
     gizmoScale.uniformScaleGizmo.isEnabled = false;

     axisScaleGizmo = new BABYLON.AxisScaleGizmo(new BABYLON.Vector3(1, 0, 1))
     axisScaleGizmo.updateGizmoPositionToMatchAttachedMesh = true;
     axisScaleGizmo.updateGizmoRotationToMatchAttachedMesh = true;

     // var gizmo = new BABYLON.PlaneRotationGizmo(new BABYLON.Vector3(0, 0, 1), BABYLON.Color3.FromHexString("#00b894"), utilLayer, 20, null, false, 5);
     // // gizmo.attachedMesh = box;
     // gizmo.scaleRatio = 0.4;
     // gizmo.updateScale = true;
     // gizmo.updateGizmoRotationToMatchAttachedMesh = true;
     // gizmo.updateGizmoPositionToMatchAttachedMesh = true;
     gizmo = new BABYLON.GizmoManager(scene); //new BABYLON.PlaneRotationGizmo (new BABYLON.Vector3(0,1,0), BABYLON.Color3.FromHexString("#00b894"), utilLayer);
     gizmo.usePointerToAttachGizmos = false;
     gizmo.boundingBoxGizmoEnabled = true;
     gizmo.boundingBoxDragBehavior.disableMovement = true;

     let boundingBoxGizmo = gizmo.gizmos.boundingBoxGizmo;
     boundingBoxGizmo.scaleDragSpeed = 0.8;
     boundingBoxGizmo.scaleBoxSize = 3;

     // Foam
     let foamWidth = 200;
     let foamHeight = 150;
     let foamDepth = 50;

    let foamWidthBabylon = foamWidth;
    let foamHeightBabylon = foamDepth;
    let foamDepthBabylon = foamHeight;
     var foam = BABYLON.MeshBuilder.CreateBox("foam", { width: foamWidthBabylon, height: foamHeightBabylon, depth: foamDepthBabylon }, scene);
     const topCenterPoint = new BABYLON.Vector3(foam.getBoundingInfo().boundingBox.center.x, foam.getBoundingInfo().boundingBox.maximum.y, foam.getBoundingInfo().boundingBox.center.z) 
     foam.setPivotPoint(topCenterPoint)
     let foamMat = new BABYLON.StandardMaterial("foam_mat", scene);
     foamMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
     foamMat.alpha = 0.9;
     foam.material = foamMat;
     var foam_bbox = foam.getBoundingInfo().boundingBox.extendSize;
     
     let foamPositions = foam.getVerticesData(BABYLON.VertexBuffer.PositionKind);

     // var cmesh = BABYLON.MeshBuilder.CreateDisc("", { radius: 0.02 }, gizmo.gizmoLayer.utilityLayerScene)
     // cmesh.material = new BABYLON.StandardMaterial("test", scene);
     // cmesh.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
     // cmesh.material.backFaceCulling = false;
     // // cmesh.position.x = -0.15;
     // // cmesh.position.z = +0.15 ;
     // // debugger;
     // // cmesh.position.z = -foam_bbox.z - 0.1;
     // gizmo.setCustomMesh(cmesh);
     const axes = new BABYLON.AxesViewer(scene, 20);
     const position = new BABYLON.Vector3(foamWidth / 2, foamHeight / 2, foam_bbox.z);
     const xAxis = new BABYLON.Vector3(-1, 0, 0);
     const yAxis = new BABYLON.Vector3(0, -1, 0);
     const zAxis = new BABYLON.Vector3(0, 0, -1);
     axes.update(position, xAxis, yAxis, zAxis);

    
     var createScene = function() {
          // Create the scene space
          scene.clearColor = new BABYLON.Color3(1, 1, 1);
          createDimensionLinesAndInputs(foamPositions);
          
          // scene.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
          // scene.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
     
          // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
          var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 1), scene);
          light.intensity = 0.5;
          var light_2 = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);
          light_2.intensity = 0.5;

          scene.onPointerObservable.add((pointerInfo) => {
               switch (pointerInfo.type) {
                    // case BABYLON.PointerEventTypes.POINTERMOVE:
                    //      let mesh = pointerInfo.pickInfo.pickedMesh;
                    //      console.log(mesh.uniqueId)
                    //      break
                    case BABYLON.PointerEventTypes.POINTERDOWN:
                         if (pointerInfo.pickInfo.hit && (pointerInfo.pickInfo.pickedMesh.name == "box" || pointerInfo.pickInfo.pickedMesh.name.includes( "poly")) || pointerInfo.pickInfo.pickedMesh.name == "Cylinder") {
                              let mesh = pointerInfo.pickInfo.pickedMesh;
                              uniqueIDRef = mesh.uniqueId;
                              pointerDragBehavior_z.attach(mesh);
                              createDepthInputOnSelectedMesh(mesh)
                              if(mesh.name.includes("Cylinder")){
                                   axisScaleGizmo.attachedMesh = mesh;
                                   gizmoScale.attachedMesh = null;
                              }else {
                                   axisScaleGizmo.attachedMesh = null;
                                   gizmoScale.attachedMesh = mesh;
                              }
                              gizmoRot.attachedMesh = mesh;
                              gizmo.attachedMesh = mesh;
                         }else{
                              gizmoRot.attachedMesh = null;
                              gizmoScale.attachedMesh = null;
                              axisScaleGizmo.attachedMesh = null;
                              meshDepthGUI.getChildren().map((item) => {
                                   item.isVisible = false
                              })
                         }
                    break;
               }
          });

          return scene;
     };
     const withinBounds = (x, y) => {
          let flagx = false;
          let flagy = false;
          if(x < foamWidth/2 && x > -foamWidth/2){
               flagx = true
          }
          if(y < foamHeight/2 && y > -foamHeight/2){
               flagy= true;
          }
          if(flagx&&flagy)
          {
               return true;
          }
          // debugger;
          return false;
     }
     const getRedMaterial = () => {
          let mat = new BABYLON.StandardMaterial("redMat", scene);
          mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
          mat.specularColor = new BABYLON.Color3(0, 0, 0);
          return mat;
     }
    const createCylinderFromContour = () => {
        const boxdim = 20;
        const outline = [];

        //curved front
        const numPoints = 80;
        const radius = 20;
        const center = new BABYLON.Vector3(0, 0, 0);
        for (let i = 0; i < numPoints; i++) {
            const angle = i * Math.PI / (numPoints / 2);
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            const point = new BABYLON.Vector3(x, 0, z).add(center);
            outline.push(point);
        }

        outline.push(outline[0]);

        const cylinder = BABYLON.MeshBuilder.ExtrudePolygon("Cylinder", { shape: outline, depth: boxdim }, scene);

        const material = new BABYLON.StandardMaterial("boxmat", scene);
        material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        // material.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
        // material.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
        // material.clipPlane3 = new BABYLON.Plane(0, 1, 0, -foamHeight/2);
        // material.clipPlane4 = new BABYLON.Plane(0, -1, 0, -foamHeight / 2);
        cylinder.material = material;
        pointerDragBehavior_z.attach(cylinder);
        cylinder.translate(BABYLON.Axis.Y, foamDepth / 2 + eps, BABYLON.Space.WORLD);
        const scaleBoxes = boundingBoxGizmo.getScaleBoxes();
        boundingBoxGizmo.setEnabledRotationAxis("");
    };
     const createBoxFromContour = () => {
          
          const boxdim = 40;
          const outline = [];

          outline.push(new BABYLON.Vector3(boxdim/2, 0, boxdim/2));
          outline.push(new BABYLON.Vector3(-boxdim / 2, 0, boxdim / 2));
          outline.push(new BABYLON.Vector3(-boxdim / 2, 0, -boxdim / 2));
          outline.push(new BABYLON.Vector3(boxdim / 2, 0, -boxdim / 2));
          outline.push(new BABYLON.Vector3(boxdim/2, 0, boxdim/2));

          //back formed automatically
          const box = BABYLON.MeshBuilder.ExtrudePolygon("box", { shape: outline, depth: boxdim }, scene);
          let box_material = new BABYLON.StandardMaterial("boxmat", scene);
          box_material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
          // box_material.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
          // box_material.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
          // box_material.clipPlane3 = new BABYLON.Plane(0, 1, 0, -foamHeight/2);
          // box_material.clipPlane4 = new BABYLON.Plane(0, -1, 0, -foamHeight / 2);
          box.material = box_material;
          
          box.translate(BABYLON.Axis.Y, foamDepth /2 + eps, BABYLON.Space.WORLD);
          // let pseudoBox = box.clone("pseudo");
          // gizmo.attachToMesh(pseudoBox);
          // pseudoBox.scaling.z = 0;
          
          // boundingBoxGizmo.onScaleBoxDragObservable.add(()=>{
          //      box.scaling.x = pseudoBox.scaling.x;
          //      box.scaling.y = pseudoBox.scaling.y;
          //      box.position.x = pseudoBox.position.x;
          //      box.position.y = pseudoBox.position.y;
          // });

          // box.onAfterRenderObservable.add(() => {
          //      pseudoBox.position = box.position;
          //      // Correct this with current boxdim
          //      pseudoBox.position.z = foam_bbox.z - boxdim / 2 + 1;
          // })

          const scaleBoxes = boundingBoxGizmo.getScaleBoxes();

          scaleBoxes[0].setEnabled(false);
          scaleBoxes[3].setEnabled(false);
          scaleBoxes[6].setEnabled(false);
          scaleBoxes[7].setEnabled(false);
          scaleBoxes[9].setEnabled(false);
          scaleBoxes[12].setEnabled(false);
          scaleBoxes[13].setEnabled(true);
          boundingBoxGizmo.setEnabledRotationAxis("");
          
          // shadow.position.y = 1.5;
          pseudoBox.visibility = 0;
          pseudoBox.isPickable = false;

     }
     const createPolyFromContour = (polyInfo, trueScale, trueDepth) => {
          // debugger;
          // alert(trueScale);
          let contourDepth = trueDepth;
          const outline = [];
          const outlineTmp = [];
          const regex = /x: (\d+), y: (\d+)/g;
          const coordinates = [];
          let match;
          let maxX=-100.0;
          let maxY=-100.0;
          let avgx = 0;
          let avgy = 0;
          let i_ = 0;
          while ((match = regex.exec(polyInfo)) !== null) {
               const x = parseFloat(match[1]);
               const y = parseFloat(match[2]);
               avgx += (x - avgx) / (i_ + 1);
               avgy += (y - avgy) / (i_ + 1);
               i_ += 1
               outline.push(new BABYLON.Vector3(x, 0, y));
          }
          // debugger;
          let avgvec = new BABYLON.Vector3(-avgx, 0, -avgy);
          for(let cter = 0; cter < outline.length ; cter=cter+1){
               let vc = outline[cter];
               if(vc.x > maxX){
                    maxX = vc.x;
               }
               if(vc.z > maxY){
                    maxY = vc.z;
               }
               outline[cter] = vc.add(avgvec)

          }
          if(maxY >= maxX){
               maxX = maxY
          }
          for(let cter = 0; cter < outline.length ; cter=cter+1){
               let vc = outline[cter];
               outline[cter] = new BABYLON.Vector3(vc.x / maxX, 0 , vc.z / maxX);
               outline[cter] = outline[cter].scale(trueScale)
               
          }
 
          outline.push(outline[0]);
          outline.reverse();

          //back formed automatically
          poly = BABYLON.MeshBuilder.ExtrudePolygon("poly"+toString(parseInt(Math.random()* 1000)), { shape: outline, depth: contourDepth }, scene);
          let box_material = new BABYLON.StandardMaterial("boxmat", scene);
          box_material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
          // box_material.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
          // box_material.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
          // box_material.clipPlane3 = new BABYLON.Plane(0, 1, 0, -foamHeight/2);
          // box_material.clipPlane4 = new BABYLON.Plane(0, -1, 0, -foamHeight / 2);
          poly.material = box_material;
          pointerDragBehavior_z.attach(poly);
          poly.translate(BABYLON.Axis.Y, foamDepth /2 + eps, BABYLON.Space.WORLD);
          
          gizmoRot.attachedMesh = poly;
          // pseudoBox.scaling.z = 0;
          
     
          const scaleBoxes = boundingBoxGizmo.getScaleBoxes();

         
          boundingBoxGizmo.setEnabledRotationAxis("");
          
          // shadow.position.y = 1.5;
          // pseudoBox.visibility = 0;
          // pseudoBox.isPickable = false;
     }
     const createBox = () => {
          let box = BABYLON.MeshBuilder.CreateBox("box", { width: 20, height: 15, depth: 25 }, scene);
          let box_material = new BABYLON.StandardMaterial("boxmat", scene);
          box_material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
          // box_material.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
          // box_material.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
          // box_material.clipPlane3 = new BABYLON.Plane(0, 1, 0, -foamHeight/2);
          // box_material.clipPlane4 = new BABYLON.Plane(0, -1, 0, -foamHeight/2);
          box.material = box_material;
          box_bbox = box.getBoundingInfo().boundingBox.extendSize;
          let translationInZ = foam_bbox.z - box_bbox.z + 0.2;
          box.translate(BABYLON.Axis.Z, translationInZ, BABYLON.Space.WORLD);
          box.enableEdgesRendering();
          box.edgesColor = new BABYLON.Color4(0, 0, 1.0, 1);
          // box.edgesWidth = 4;
          pointerDragBehavior_z.attach(box);
          
     
          box.onBeforeRenderObservable.add((event) => {
               if(scene.activeCamera.name == "camera2"){
                    box.edgesWidth = 0.3;
               }
               else{
                    box.edgesWidth = 16;
               }
               var boxPositions = box.getVerticesData(BABYLON.VertexBuffer.PositionKind);
               var pos1 = new BABYLON.Vector3(boxPositions[0], boxPositions[1], boxPositions[2]);
               var pos2 = new BABYLON.Vector3(boxPositions[3], boxPositions[4], boxPositions[5]);
               var pos3 = new BABYLON.Vector3(boxPositions[6], boxPositions[7], boxPositions[8]);
               var pos4 = new BABYLON.Vector3(boxPositions[9], boxPositions[10], boxPositions[11]);
               // let meshPos  = box.position;
               let mat = box.getWorldMatrix();
               pos1 = new BABYLON.Vector3.TransformCoordinates(pos1, mat);
               pos2 = new BABYLON.Vector3.TransformCoordinates(pos2, mat);
               pos3 = new BABYLON.Vector3.TransformCoordinates(pos3, mat);
               pos4 = new BABYLON.Vector3.TransformCoordinates(pos4, mat);
               if(withinBounds(pos1.x, pos1.y)){

               }
               else if(pos1.x > foamWidth/2){
                   // pointerDragBehavior_z.detach(mesh);
                   
                    box.position.x = 100-10;
               }
               else if(pos1.x < -foamWidth/2){
                    box.position.x = -(100-10);
               }
              
          });
          gizmo.attachedMesh = box;
        
          // scene.onPointerDown = (e)=>{
          //      scene.activeCamera.lowerRadiusLimit = 1;
          //      scene.activeCamera.upperRadiusLimit = 4;
          // }
     }

     const createDimensionLinesAndInputs = (foamPositions) => {
          let pos1 = new BABYLON.Vector3(foamPositions[0], foamPositions[1], foamPositions[2]);
          let pos2 = new BABYLON.Vector3(foamPositions[3], foamPositions[4], foamPositions[5]);
          let pos3 = new BABYLON.Vector3(foamPositions[6], foamPositions[7], foamPositions[8]);
          let pos4 = new BABYLON.Vector3(foamPositions[9], foamPositions[10], foamPositions[11]);
          let pos5 = new BABYLON.Vector3(foamPositions[12], foamPositions[13], foamPositions[14])
          let spaceVectY = new BABYLON.Vector3(0,6,0);//Add spacing on dimension lines in Y
          let spaceVectX = new BABYLON.Vector3(6,0,0);//Add spacing on dimension lines in X
          let spaceVectZ = new BABYLON.Vector3(6,6,0);//Add spacing on dimension lines in Z

          const myPointsHorizontal = [ pos3.add(spaceVectY), pos4.add(spaceVectY) ];
          const myPointsVertical = [ pos1.add(spaceVectX), pos4.add(spaceVectX) ];
          const myPointsZaxis = [ pos5.add(spaceVectY), pos4.add(spaceVectY) ]
     
          const linesHorizontal = BABYLON.MeshBuilder.CreateDashedLines("linesHorizontal", {points: myPointsHorizontal});
          linesHorizontal.color = new BABYLON.Color3(0, 0, 0);
          // linesHorizontal.setPivotPoint(linesHorizontal.getBoundingInfo().boundingBox.maximum)

          const linesVertical = BABYLON.MeshBuilder.CreateDashedLines("linesVertical", {points: myPointsVertical});
          linesVertical.color = new BABYLON.Color3(0, 0, 0);
          let linesVerticalCenterPoint = new BABYLON.Vector3(foam.getBoundingInfo().boundingBox.center.x, linesVertical.getBoundingInfo().boundingBox.maximum.y, foam.getBoundingInfo().boundingBox.center.z)
          linesVertical.setPivotPoint(linesVerticalCenterPoint)

          const linesZaxis = BABYLON.MeshBuilder.CreateDashedLines("linesZaxis", {points: myPointsZaxis})
          linesZaxis.color = new BABYLON.Color3(0, 0, 0);
          // linesZaxis.setPivotPoint(linesZaxis.getBoundingInfo().boundingBox.maximum)
               
          let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");


          let inputTextHorizontal = new BABYLON.GUI.InputText();    // using InputText as TextBlock for autoStretchWidth functionality
          inputTextHorizontal.width = "5%";    // reduce the visibility of the TextInput resizing
          inputTextHorizontal.height = "3%";
          inputTextHorizontal.isHitTestVisible = true;
          inputTextHorizontal.background = "#ffffff";
          inputTextHorizontal.autoStretchWidth = true;
          inputTextHorizontal.text = foamWidthBabylon;
          inputTextHorizontal.fontSize = 15;
          inputTextHorizontal.color = "#000000";
          inputTextHorizontal.focusedBackground = "#ffffff"
          inputTextHorizontal.thickness = 2;
          inputTextHorizontal.linkOffsetYInPixels = 0;
          advancedTexture.addControl(inputTextHorizontal);
          inputTextHorizontal.linkWithMesh(linesHorizontal);
          inputTextHorizontal.onBlurObservable.add(e => {
               // inputTextHorizontal.text = foamWidth;
          });
          let lineCutDataH = createDimensionEndingsHorizontal(foamPositions);
          let linesHorizontalRight = lineCutDataH[0];
          // linesHorizontalRight.setPivotPoint(linesHorizontalRight.getBoundingInfo().boundingBox.maximum)
          let linesHorizontalLeft = lineCutDataH[1];
          // linesHorizontalLeft.setPivotPoint(linesHorizontalLeft.getBoundingInfo().boundingBox.maximum)
          // createDimensionEndingsVertical(foamPositions);
      

          let textHeight = new BABYLON.GUI.TextBlock();
          textHeight.width = "5%";    // reduce the visibility of the TextInput resizing
          textHeight.height = "3%";
          textHeight.text = "Width";
          textHeight.color = "#000000";
          textHeight.background = "white";
          // background.alpha = 0.7
          textHeight.fontSize = 15;
          textHeight.linkOffsetYInPixels = -25;
          advancedTexture.addControl(textHeight);   
          textHeight.linkWithMesh(linesHorizontal);
          
          
          let inputTextVertical = new BABYLON.GUI.InputText();    // using InputText as TextBlock for autoStretchWidth functionality
          inputTextVertical.width = "4%";    // reduce the visibility of the TextInput resizing
          inputTextVertical.height = "3%";
          inputTextVertical.isHitTestVisible = true;
          inputTextVertical.background = "#ffffff";
          inputTextVertical.autoStretchWidth = true;
          inputTextVertical.text = foamHeightBabylon;
          inputTextVertical.fontSize = 15;
          inputTextVertical.color = "black";
          inputTextVertical.focusedBackground = "#ffffff"
          inputTextVertical.thickness = 2;
          inputTextVertical.linkOffsetYInPixels = 0;
          advancedTexture.addControl(inputTextVertical);
          inputTextVertical.linkWithMesh(linesVertical);

          let lineCutDataV = createDimensionEndingsVertical(foamPositions);
          let linesHorizontaTop = lineCutDataV[0];
          let linesHorizontalDown = lineCutDataV[1];
          let centerTopPoint = new BABYLON.Vector3(foam.getBoundingInfo().boundingBox.center.x, linesHorizontalDown.getBoundingInfo().boundingBox.maximum.y, foam.getBoundingInfo().boundingBox.center.z)
          linesHorizontaTop.setPivotPoint(centerTopPoint)
          linesHorizontalDown.setPivotPoint(centerTopPoint)

          let textWidth = new BABYLON.GUI.TextBlock();
          textWidth.width = "4%";    // reduce the visibility of the TextInput resizing
          textWidth.height = "3%";
          textWidth.text = "Depth";
          textWidth.color = "#000000";
          textWidth.background = "white";
          // background.alpha = 0.7
          textWidth.fontSize = 15;
          textWidth.linkOffsetXInPixels = -45;
          advancedTexture.addControl(textWidth);   
          textWidth.linkWithMesh(linesVertical);

          let inputTextZaxis = new BABYLON.GUI.InputText();    // using InputText as TextBlock for autoStretchWidth functionality
          inputTextZaxis.width = "0%";    // reduce the visibility of the TextInput resizing
          inputTextZaxis.height = "3%";
          inputTextZaxis.isHitTestVisible = true;
          inputTextZaxis.background = "#ffffff";
          inputTextZaxis.autoStretchWidth = true;
          inputTextZaxis.text = foamDepthBabylon;
          inputTextZaxis.fontSize = 15;
          inputTextZaxis.color = "black";
          inputTextZaxis.focusedBackground = "#ffffff"
          inputTextZaxis.thickness = 2;
          inputTextZaxis.linkOffsetYInPixels = 0;
          advancedTexture.addControl(inputTextZaxis);
          inputTextZaxis.linkWithMesh(linesZaxis);

          let lineCutDataZ = createDimensionEndingsZaxis(foamPositions);
          let linesZaxisLeft = lineCutDataZ[0];
          // linesZaxisLeft.setPivotPoint(linesZaxisLeft.getBoundingInfo().boundingBox.maximum)

          let textDepth = new BABYLON.GUI.TextBlock();
          textDepth.width = "4%";    // reduce the visibility of the TextInput resizing
          textDepth.height = "3%";
          textDepth.text = "Height";
          textDepth.color = "#000000";
          textDepth.background = "white";
          // background.alpha = 0.7
          textDepth.fontSize = 15;
          textDepth.linkOffsetXInPixels = -45;
          advancedTexture.addControl(textDepth);   
          textDepth.linkWithMesh(linesZaxis);

          inputTextHorizontal.onKeyboardEventProcessedObservable.add(e => {
               let key = e.key;
               if(key == "Enter"){
                    let input = parseInt(inputTextHorizontal.text);
                    let ratio = input/foamWidthBabylon;
                    // debugger;
                    foamWidthBabylon = input;
                    foam.scaling.x *= ratio;
                    linesHorizontal.scaling.x *= ratio;
                    // test
                    linesVertical.scaling.x *= ratio;
                    linesZaxis.scaling.x *= ratio;
                    

                    linesHorizontalRight.scaling.x *= ratio;
                    linesHorizontalLeft.scaling.x *= ratio;

                    linesHorizontaTop.scaling.x *= ratio;
                    linesHorizontalDown.scaling.x *= ratio;

                    linesZaxisLeft.scaling.x *= ratio;
                    const position = new BABYLON.Vector3(foamWidthBabylon / 2, foam_bbox.z, foamDepthBabylon / 2);
                    axes.update(position, xAxis, yAxis, zAxis);
               }
               if (key < "0" || key > "9") {
                    e.addKey = false;
               }
          });

          inputTextVertical.onKeyboardEventProcessedObservable.add(e => {
               let key = e.key;
               if(key == "Enter"){
                    let input = parseInt(inputTextVertical.text);
                    let ratio = input/foamHeightBabylon;
                    // debugger;
                    foamHeightBabylon = input;
                    foam.scaling.y *= ratio;
                    linesVertical.scaling.y *= ratio;
                    // linesHorizontal.scaling.y *= ratio;
                    // linesZaxis.scaling.y *= ratio;
                    // linesZaxisLeft.scaling.y *= ratio;
                    linesHorizontaTop.scaling.y *= ratio;
                    linesHorizontalDown.scaling.y *= ratio;
                    // linesHorizontalRight.scaling.y *= ratio;
                    // linesHorizontalLeft.scaling.y *= ratio;
                    // const position = new BABYLON.Vector3(foamWidthBabylon / 2, foamHeightBabylon / 2, foamDepthBabylon / 2);
                    // axes.update(position, xAxis, yAxis, zAxis);
               }
               if (key < "0" || key > "9") {
                    e.addKey = false;
               }
          });

          inputTextZaxis.onKeyboardEventProcessedObservable.add(e => {
               let key = e.key;
               if(key == "Enter"){
                    let input = parseInt(inputTextZaxis.text);
                    let ratio = input/foamDepthBabylon;
                    // debugger;
                    foamDepthBabylon = input;
                    foam.scaling.z *= ratio;
                    linesVertical.scaling.z *= ratio;
                    linesHorizontal.scaling.z *= ratio;
                    linesZaxis.scaling.z *= ratio;
                    linesHorizontaTop.scaling.z *= ratio;
                    linesHorizontalDown.scaling.z *= ratio;
                    linesHorizontalRight.scaling.z *= ratio;
                    linesHorizontalLeft.scaling.z *= ratio;
                    linesZaxisLeft.scaling.z *= ratio;
                    const position = new BABYLON.Vector3(foamWidthBabylon / 2, foam_bbox.z, foamDepthBabylon / 2);
                    axes.update(position, xAxis, yAxis, zAxis);
               }
               if (key < "0" || key > "9") {
                    e.addKey = false;
               }
          });
     }

     const calculateFoamPosition = () => {
          return;
     }

     const createDimensionEndingsHorizontal = (foamPositions) => {
          let pos1 = new BABYLON.Vector3(foamPositions[0], foamPositions[1], foamPositions[2]);
          let pos2 = new BABYLON.Vector3(foamPositions[3], foamPositions[4], foamPositions[5]);
          let pos3 = new BABYLON.Vector3(foamPositions[6], foamPositions[7], foamPositions[8]);
          let pos4 = new BABYLON.Vector3(foamPositions[9], foamPositions[10], foamPositions[11]);
          pos3 = pos3.add(new BABYLON.Vector3(0,6,0));
          pos4 = pos4.add(new BABYLON.Vector3(0,6,0));
          let spaceVectY = new BABYLON.Vector3(0,3,0);
          const myPointsHorizontalRight = [ pos3.add(spaceVectY), pos3.add(spaceVectY.scale(-1)) ];
          const myPointsHorizontalLeft = [ pos4.add(spaceVectY), pos4.add(spaceVectY.scale(-1)) ];
          const linesHorizontalRight = BABYLON.MeshBuilder.CreateLines("linesHorizontalUp", {points: myPointsHorizontalRight});
          linesHorizontalRight.color = new BABYLON.Color3(0, 0, 0);
          const linesHorizontalLeft = BABYLON.MeshBuilder.CreateLines("linesHorizontalUp", {points: myPointsHorizontalLeft});
          linesHorizontalLeft.color = new BABYLON.Color3(0, 0, 0);
          return [linesHorizontalRight, linesHorizontalLeft];

     }

     const createDimensionEndingsVertical = (foamPositions) => {
          let pos1 = new BABYLON.Vector3(foamPositions[0], foamPositions[1], foamPositions[2]);
          let pos2 = new BABYLON.Vector3(foamPositions[3], foamPositions[4], foamPositions[5]);
          let pos3 = new BABYLON.Vector3(foamPositions[6], foamPositions[7], foamPositions[8]);
          let pos4 = new BABYLON.Vector3(foamPositions[9], foamPositions[10], foamPositions[11]);
          pos1 = pos1.add(new BABYLON.Vector3(6,0,0));
          pos4 = pos4.add(new BABYLON.Vector3(6,0,0));
          let spaceVectY = new BABYLON.Vector3(3,0,0);
          const myPointsVerticalTop = [ pos4.add(spaceVectY), pos4.add(spaceVectY.scale(-1)) ];
          const myPointsVerticalBottom = [ pos1.add(spaceVectY), pos1.add(spaceVectY.scale(-1)) ];
          const linesHorizontalDown = BABYLON.MeshBuilder.CreateLines("linesVerticalUp", {points: myPointsVerticalTop});
          linesHorizontalDown.color = new BABYLON.Color3(0, 0, 0);
          const linesHorizontalLeft = BABYLON.MeshBuilder.CreateLines("linesVerticalDown", {points: myPointsVerticalBottom});
          linesHorizontalLeft.color = new BABYLON.Color3(0, 0, 0);
          return [linesHorizontalLeft, linesHorizontalDown];
     }

     const createDimensionEndingsZaxis = (foamPositions) => {
          let pos5 = new BABYLON.Vector3(foamPositions[12], foamPositions[13], foamPositions[14])
          pos5 = pos5.add(new BABYLON.Vector3(0,6,0));

          let spaceVectY = new BABYLON.Vector3(0,3,0);
          const myPointsZaxisTop = [ pos5.add(spaceVectY), pos5.add(spaceVectY.scale(-1)) ];
          const linesZaxisLeft = BABYLON.MeshBuilder.CreateLines("linesVerticalUp", {points: myPointsZaxisTop});
          linesZaxisLeft.color = new BABYLON.Color3(0, 0, 0);
          return [linesZaxisLeft];
     }

     function createMat(mat_){
          let savedMat = new BABYLON.Matrix();
          console.log("matrix ")
          console.log(mat_._m[0],mat_._m[1],mat_._m[2],mat_._m[3])
          console.log(mat_._m[4],mat_._m[5],mat_._m[6],mat_._m[7])
          console.log(mat_._m[8],mat_._m[9],mat_._m[10],mat_._m[11])
          console.log(mat_._m[12],mat_._m[13],mat_._m[14],mat_._m[15])
          for(var i = 0; i < 16; i++){
              savedMat._m[i] = mat_._m[i]
      
          }
          return savedMat;
      }

     const createDepthInputOnSelectedMesh = (mesh) => {
          let binfo = mesh.getBoundingInfo().boundingBox;
          let meshDepth = binfo.maximum.y - binfo.minimum.y;
          meshDepthGUI = new BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("meshDepthUI");
          // let depthInputText = new BABYLON.GUI.InputText();    // using InputText as TextBlock for autoStretchWidth functionality
          if(depthInputText) depthInputText.dispose()
          depthInputText = new BABYLON.GUI.InputText();    // using InputText as TextBlock for autoStretchWidth functionality
          depthInputText.width = "0%";    // reduce the visibility of the TextInput resizing
          depthInputText.height = "3%";
          depthInputText.isHitTestVisible = true;
          depthInputText.background = "#ffffff";
          depthInputText.autoStretchWidth = true;
          depthInputText.text = meshDepth;
          depthInputText.fontSize = 15;
          depthInputText.color = "#000000";
          depthInputText.focusedBackground = "#ffffff"
          depthInputText.thickness = 2;
          depthInputText.linkOffsetYInPixels = 0;
          meshDepthGUI.addControl(depthInputText);
          depthInputText.linkWithMesh(mesh);

          // let textMeshDepth = new BABYLON.GUI.TextBlock();
          if(textMeshDepth) textMeshDepth.dispose()
          textMeshDepth = new BABYLON.GUI.TextBlock();
          textMeshDepth.width = "5%";    // reduce the visibility of the TextInput resizing
          textMeshDepth.height = "3%";
          textMeshDepth.text = "Depth";
          textMeshDepth.color = "#000000";
          textMeshDepth.background = "white";
          textMeshDepth.fontSize = 15;
          textMeshDepth.linkOffsetYInPixels = -25;
          meshDepthGUI.addControl(textMeshDepth);
          textMeshDepth.linkWithMesh(mesh);

          depthInputText.onKeyboardEventProcessedObservable.add(async (e) => {
               let key = e.key;
               if(key == "Enter"){
                    let input = parseInt(depthInputText.text);
                    let ratio = input/meshDepth;
                    meshDepth = input;
                    mesh.scaling.y = ratio;
                    let min = mesh.getBoundingInfo().boundingBox.minimum;
                    let max = mesh.getBoundingInfo().boundingBox.maximum;
                    let newMin = new BABYLON.Vector3(min.x, -input, min.z)
                    let newBInfo = new BABYLON.BoundingInfo(newMin, max)
                    mesh.setBoundingInfo(newBInfo)
               }
               if (key < "0" || key > "9") {
                    e.addKey = false;
               }
          });
     }
     
     function PerformSubtraction() {
          var csgFoam = BABYLON.CSG.FromMesh(foam);
          let disposables = [];
          for (let i = 0; i < scene.meshes.length; i++) {
               if (scene.meshes[i].name === "box" || scene.meshes[i].name.includes("poly") || scene.meshes[i].name.includes("Cylinder")) {
                    let box = BABYLON.CSG.FromMesh(scene.meshes[i]);
                    csgFoam = csgFoam.subtract(box);
                    disposables.push(scene.meshes[i]);
               }
               else if (scene.meshes[i].name === "foam") {
                    disposables.push(scene.meshes[i]);
               }
          }
          let materialResult = new BABYLON.StandardMaterial("result", scene);
          materialResult.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
          resultMesh = csgFoam.toMesh('resultMesh', materialResult, scene, false);
          for (let i = 0; i < disposables.length; i++) {
               disposables[i].dispose();
          }
       
     }
     document.getElementById('Subtract').addEventListener('click', function() {
          PerformSubtraction();
     });

     document.getElementById('zoomIn').addEventListener('click', function() {
          let position = scene.cameras[0].position;
          let offset = new BABYLON.Vector3(0,0,-5);
          scene.cameras[0].setPosition(position.add(offset));
     });

     document.getElementById('zoomOut').addEventListener('click', function() {
          let position = scene.cameras[0].position;
          let offset = new BABYLON.Vector3(0,0,5);
          scene.cameras[0].setPosition(position.add(offset));
     });

     document.getElementById('drawSquare').addEventListener('click', function() {
          // createBox();
          createBoxFromContour();
     });

     document.getElementById('drawCircle').addEventListener('click', function() {
          // createBox();
          createCylinderFromContour();
     });

     document.getElementById('OrthoCam').addEventListener('click', function() {
          scene.activeCamera = cameraOrtho;
          scene.activeCamera.attachControl(canvas, true);
          document.getElementById('zoomIn').setAttribute("class", "btn bg-transparent rounded-0 btn-space disabled");
          document.getElementById('zoomOut').setAttribute("class", "btn bg-transparent rounded-0 btn-space disabled"); 
          
          // document.getElementById('zoomOut').style.visibility = 'hidden';
     });

     document.getElementById('PerspectiveCam').addEventListener('click', function() {
          scene.activeCamera = camera;
          scene.activeCamera.attachControl(canvas, true);
          document.getElementById('zoomIn').setAttribute("class", "btn bg-transparent rounded-0 btn-space enabled");
          document.getElementById('zoomOut').setAttribute("class", "btn bg-transparent rounded-0 btn-space enabled"); 
     });

     document.getElementById('UnLock').addEventListener('click', function() {
          var unlockDiv = document.getElementById('UnLock');
          unlockDiv.removeChild(unlockDiv.firstElementChild);
          if(lock){
               unlockDiv.innerHTML = '<i class="fa-solid fa-lock"></i>';
          }
          else{
               unlockDiv.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i>';
          }
          lock = !lock

     });
     const createContour = (contourPath) => {
          
          const regex = /x: (\d+), y: (\d+)/g;
          const coordinates = [];
          let match;

          while ((match = regex.exec(contourPath)) !== null) {
               const x = parseInt(match[1], 10);
               const y = parseInt(match[2], 10);
               coordinates.push([x, y]);
          }

          debugger;
     }
     //Add Element click action
     $(document).on('click', '.add-item', function() {
          // This will work!
          var uniqueElementID = $(this).attr('value');
          var valueCurrentContourPath = $('#contourPreviewImage_' + uniqueElementID + ' .contourImageFrame').attr('contour_path');
          var trueValueContour = $('#contourPreviewImage_' + uniqueElementID + ' .contourImageFrame').attr('true_value');
          var trueDepth = $('#contourPreviewImage_' + uniqueElementID + ' .contourImageFrame').attr('depth_value');
          //console.log("***"+valueCurrentContourPath);
          if(trueValueContour === ""){
               trueValueContour = 1;
          }
          if(trueDepth === ""){
               trueDepth = foamDepth/4;
          }
          createPolyFromContour(valueCurrentContourPath, trueValueContour, trueDepth);
          // debugger;
          
     });
     //Remove Element click action
     $(document).on('click', '.remove-item', function() {
          // This will work!
          
     });
     
     //Open modal, on click image
     $(document).on('click', '.previewImage', function() {
          // This will work!
          var srcImage = $(this).attr('src');
          $('.originalImage').attr('src', srcImage);
          var uniqueImageID = $(this).attr('id').replace("previewImage_", "");
          if($(this).attr('is_contour_active') != "true"){
               $(".confirmContourAction").prop('disabled', true);
               $(".getContourAction").prop('disabled', false);
               $("#contourModal .numberContours").text('');
               $("#contourModal .groundContours").empty();
               $('.getContourAction').attr('value_action', uniqueImageID);
               $('.confirmContourAction').attr('value_action', uniqueImageID);
               $('#contourModal').attr('value_id', uniqueImageID);
               $('#contourModal').modal('show');
          }
          else{
               //$('#contourModal').modal('show');
          }
     });

     //scale canvas
     function handleScaleCanvas() {
          const canvas = document.getElementById("drawCanvas");
          const context = canvas.getContext("2d");
          // context.clearRect(0, 0, canvas.width, canvas.height);
          context.save();
          context.scale(scale, scale);
          populatePoly(contourPointsData)

          context.restore();
          $("#drawCanvas").css({"background-size": `${backgroundWidth * scale}px ${backgroundHeight * scale}px` });
     }

     function zoomIn() {
          scale += 0.1;
          handleScaleCanvas();
      }

     function zoomOut() {
          if (scale > 0.1) {
               scale -= 0.1;
               handleScaleCanvas();
          }
     }

     //Get Compute action
     $(document).on('click', '.getContourAction', function () {
          loadSpinner();
          //console.log('Get contour action');
          var uniqueModalID = $(this).attr('value_action');
          var originalImageData = $('.originalImage').attr('src');
          var rawBase64Img = originalImageData.replace(/^data:image\/(png|jpg);base64,/, "");
          const imgTest = new Image();
          imgTest.src = $('.originalImage').attr('src');
          // debugger;

          // console.log(imgTest.naturalWidth + '*******');
          $.ajax({
               url: "http://127.0.0.1:8000/contour",
               type: "POST",
               contentType: 'application/json',
               dataType: "json",
               data: JSON.stringify({"image": rawBase64Img, "height": 3, "width": 3}),
               success: function (resultContours) {
                    stopSpinner();
                    scale = 1.0;
                    transformDeltaX = 0;
                    transformDeltaY = 0;
                    contourPointsData = []
                    isCanvasEventListener = false;
                    $('#work_area').empty();
                    let length = 1;//Object.keys(resultContours).length;
                    console.log("Length of contours received - "+ length);
                    //$('.numberContours').text('Number of contours found - '+length).css('display', 'block');

                    //Disable Get Contours button
                    $(this).prop('disabled', true);
                    const originalImage = new Image();
                    originalImage.src = $('.originalImage').attr('src');
                    backgroundHeight = originalImage.height;
                    backgroundWidth = originalImage.width;
                    let actualHeight = originalImage.naturalHeight;
                    let actualWidth = originalImage.naturalWidth;
                    let aspectRatio =  actualHeight / actualWidth;
                    let scaleFactor = actualHeight / (180 * aspectRatio);
                    document.getElementsByClassName("originalFrame")[0].style.visibility = 'hidden';
                    document.getElementsByClassName("originalFrame")[0].style.position = 'absolute';

                    for(var indexContours = 0; indexContours < length; indexContours++){
                         var elementID = 'drawCanvas';//'contour'+uniqueModalID+'_canvas_'+(indexContours+1);
                         $('<canvas>').attr({
                              id: elementID,
                              class: "canvasContourFrame",
                              value_selected: "false",
                              height: 300,
                              width: 500,
                         }).appendTo('#work_area');
                         $("#drawCanvas").css({"background-image": "url(" + originalImage.src + ")", "background-repeat": "no-repeat", "background-size": `${backgroundWidth}px ${backgroundHeight}px` });
                         $(`<div>
                              <button id="zoomInCanvas"><i class="fa-solid fa-circle-plus"></i></button>
                              <button id="zoomOutCanvas"><i class="fa-solid fa-circle-minus"></i></button>
                            <div>`)
                         .appendTo("#work_area");
                         $("<label for="+indexContours+">True Width:</label><input id='"+uniqueModalID+"_dimensionValue' style='margin:0 auto;display:block;width:300px' name='dimensionValue' type='text' value='' placeholder='Provide value'/>").appendTo("#work_area");
                         $("<label for="+indexContours+">Depth:</label><input id='"+uniqueModalID+"_depthValue' style='margin:0 auto;display:block;width:300px' name='dimensionValue' type='text' value='' placeholder='Provide value'/>").appendTo("#work_area");
                         // $('').appendTo("#work_area")
                         
                         $(document).on("click", "#zoomInCanvas", zoomIn)
                         $(document).on("click", "#zoomOutCanvas", zoomOut)
                         
                         var canvasContour = document.getElementById(elementID);
                         var ctx = canvasContour.getContext('2d');
                         //ctx.beginPath();
                         //ctx.drawImage(originalImage,0,0);
                         //ctx.moveTo(0, 0);
                         
                         // debugger;

                         var pathString = "";
                         let minX = Math.min.apply(Math, resultContours[indexContours].map(function (event){
                              return event.x;
                         }));
                         let maxX = Math.max.apply(Math, resultContours[indexContours].map(function (event) {
                              return event.x;
                         }));
                         let minY = Math.min.apply(Math, resultContours[indexContours].map(function (event){
                              return event.y;
                         }));
                         let maxY = Math.max.apply(Math, resultContours[indexContours].map(function (event) {
                              return event.y;
                         }));
                         
                         var pointsContour = [];
                         for(var indexContoursDraw = 0; indexContoursDraw < resultContours[indexContours].length; indexContoursDraw++){
                              pathString += "{ x: "+resultContours[indexContours][indexContoursDraw].x + ", y: " + resultContours[indexContours][indexContoursDraw].y + "},";
                              //ctx.lineTo(resultContours[indexContours][indexContoursDraw].x / scaleFactor,resultContours[indexContours][indexContoursDraw].y /  scaleFactor );
                              pointsContour.push(
                                   {    'x': parseInt(resultContours[indexContours][indexContoursDraw].x),
                                        'y': parseInt(resultContours[indexContours][indexContoursDraw].y)
                                   });
                         }
                         pathString = pathString.replace(/,\s*$/, "");
                         // var t = []
                         contourPointsData.push(pointsContour[0])

                         for(let p_ = 1; p_ < pointsContour.length; p_++){
                              let lastp_ =  p_-1;
                              let v_ = p_;
                              while(l2dist(pointsContour[lastp_], pointsContour[v_]) < 5 && v_ < pointsContour.length - 1){
                                   v_ += 1;
                              }
                              p_ = v_;
                              contourPointsData.push(pointsContour[p_])

                         }

                         // t.push(pointsContour[0])
                         // t.push(pointsContour[10])
                         // t.push(pointsContour[20])
                         // t.push(pointsContour[50])
                         // t.push(pointsContour[pointsContour.length - 1])

                         $(canvasContour).attr('contour_path', pathString);
                         
                         console.log("Minimum value of X = " +
                              Math.min.apply(Math, resultContours[indexContours].map(function (event) {
                              return event.x;
                         })));
                         console.log("Maximum value of X = " +
                              Math.max.apply(Math, resultContours[indexContours].map(function (event) {
                              return event.y;
                         })));
                         let pointsContour1 = [{
                              x: 164,
                              y: 89
                            }, {
                              x: 127,
                              y: 138
                            }, {
                              x: 256,
                              y: 140
                            }];
                         if(points.length > 0){
                              points = []
                              clearCanvasDrawingState();
                         }
     
                         populatePoly(contourPointsData);
                         
                         //document.getElementsByClassName("originalFrame").style.visibility = 'hidden';
                    }
               },
               error: function (xhr, status, error) {
                    alert("failed: Contact Application admin");
               }
          });
          //debugger;
          
          //Invoke API to get contours
          // var resultContours = [];
          // var resultContours = [
          //      [
          //            { x: 50, y: 70 },
          //            { x: 80, y: 90 },
          //           { x: 90, y: 100 }
          //      ],
          //      [
          //           { x: 0, y: 0 },
          //           { x: 0, y: 50 },
          //           { x: 50, y: 50 },
          //           { x: 50, y: 0 }
          //      ],
          //      [
          //           { x: 0, y: 0 },
          //           { x: 0, y: 50 },
          //           { x: 50, y: 50 },
          //           { x: 75, y: 100 },
          //           { x: 100, y: 0 }
          //      ]
          // ];

        
     });

     $(document).on('click', '.canvasContourFrame', function() {
          $('.canvasContourFrame').attr('value_selected', 'false');
          $('.canvasContourFrame').css('border', "1px solid #967E76");
          $(this).css('border', "solid 6px #54B435");
          $(this).attr('value_selected', 'true');
          $(".confirmContourAction").prop('disabled', false);
     });

     $(document).on('click', '.confirmContourAction', function() {
          $('#contourModal').modal('hide');
          var selectedCanvasID = $('.modal[value_id='+$(this).attr('value_action')+'] .groundContours').find("canvas[value_selected=true]").attr("id");
          console.log(JSON.stringify(selectedCanvasID));
          const ctx = document.getElementById("drawCanvas").getContext("2d");
          ctx.clearRect(0, 0, backgroundWidth * scale + Math.abs(transformDeltaX), backgroundHeight * scale + Math.abs(transformDeltaY));
          const transform = ctx.getTransform();
          ctx.setTransform(transform.a, transform.b, transform.c, transform.d, 0, 0)
          handleScaleCanvas()
          var canvasOriginal = document.querySelector('#'+selectedCanvasID);
          var originalImage = document.querySelector('.originalImage.frameImage')
          var newCanvas = document.createElement('canvas');
          var context = newCanvas.getContext('2d');
          newCanvas.width = 180 * scale;
          // newCanvas.height = 300 * (canvasOriginal.height/canvasOriginal.width);
          newCanvas.height = originalImage.clientHeight * scale;
          context.drawImage(canvasOriginal, 0, 0);
          newCanvas.setAttribute('id', canvasOriginal.getAttribute('id'));
          newCanvas.setAttribute('contour_path', canvasOriginal.getAttribute('contour_path'));

          $("#contourPreviewImage_"+$(this).attr('value_action')+" canvas").remove();
          //$(newCanvas).appendTo("#contourPreviewImage_"+$(this).attr('value_action'));
          //var newCanvasImage = "<img class='contourImageFrame' src="+newCanvas.toDataURL()+" width=180 contour_path='"+canvasOriginal.getAttribute('contour_path')+"' />";
          var pathStringTemp = "";
          
          for(var indexContoursTempDraw = 0; indexContoursTempDraw < points.length; indexContoursTempDraw++){
               pathStringTemp += "{ x: "+points[indexContoursTempDraw].x + ", y: " + points[indexContoursTempDraw].y + "},";
               //ctx.lineTo(resultContours[indexContours][indexContoursDraw].x / scaleFactor,resultContours[indexContours][indexContoursDraw].y /  scaleFactor );
          }
          pathStringTemp = pathStringTemp.replace(/,\s*$/, "");
          var trueValueTemp = $("#"+$(this).attr('value_action')+"_dimensionValue").val();
          var trueDepthTemp = $("#"+$(this).attr('value_action')+"_depthValue").val();
          var newCanvasImage = "<img class='contourImageFrame' src="+newCanvas.toDataURL()+" contour_path='"+pathStringTemp+"' true_value='"+trueValueTemp+"' depth_value='"+ trueDepthTemp+"'/>";
          $(newCanvasImage).appendTo("#contourPreviewImage_"+$(this).attr('value_action'));
          var imageTempURL = $("#previewImage_"+$(this).attr('value_action')).attr('src');
          $("#contourPreviewImage_"+$(this).attr('value_action')).css({"background-image": "url(" + imageTempURL + ")", "background-repeat": "no-repeat", "background-size": "contain", "height": newCanvas.height + "px", "width": newCanvas.width + "px"});
          $("#previewImage_"+$(this).attr('value_action')).attr("is_contour_active", "true");
     });

     //Reset panel
     $(document).on('click', '#resetBtn', function() {
          $(".list-group").empty();
     });

     $(document).on('click', '#Undo', function() {
          console.log("UNDO PRESSED")
          if(undo.length > 0){
               let lastCmd = undo.pop();
               redo.unshift(lastCmd);
               let scale_ = new BABYLON.Vector3();
               let rotation_ = new BABYLON.Quaternion();
               let position_ = new BABYLON.Vector3();
               let mesh = scene.getMeshByUniqueId(lastCmd.id);
               let lmat = createMat(lastCmd.mprev); 
               lmat.decompose(scale_, rotation_, position_);
               let worldMatrix = BABYLON.Matrix.Compose(scale_, rotation_, position_); 
               worldMatrix.decomposeToTransformNode(mesh);
               console.log(undo);
           }
   
     });

     $(document).on('click', '#Redo', function() {
          console.log("REDO PRESSED")
          if(redo.length > 0){
               let lastCmd_ = redo.shift();
               undo.push(lastCmd_);
               let scale_ = new BABYLON.Vector3();
               let rotation_ = new BABYLON.Quaternion();
               let position_ = new BABYLON.Vector3()
               let lmat = createMat(lastCmd_.m); 
               lmat.decompose(scale_, rotation_, position_);
               let worldMatrix = BABYLON.Matrix.Compose(scale_, rotation_, position_); 
               let mesh = scene.getMeshByUniqueId(lastCmd_.id);
               worldMatrix.decomposeToTransformNode(mesh);
           }

   
     });

     //Save the Babylon Scene
     $(document).on('click', '#saveSceneBtn', function() {
          if(confirm('Are you sure you would like to save your data?')){
               //Save Babylon scene data
               const sessionId = new URLSearchParams(window.location.search).get('id');
               if(sessionId != "" && sessionId != null){
                    saveScene(sessionId, scene);
               }
          }
          else{
               //Do not do anything
          }
     });

     function clearCanvasDrawingState(){
          clearCanvas();
          points = []
          lastIdx = -1;
          pixelHash = {}
          mousedn = false;
          state = allStates.NOOP;
     }
     
     //Function to save the babylon scene
     function saveScene(sessionId, scene){
          loadSpinner();
          var objectUrl
          if(objectUrl) {
               window.URL.revokeObjectURL(objectUrl);
           }
          //const serializedMesh = BABYLON.SceneSerializer.SerializeMesh(poly);
          var serializedScene = BABYLON.SceneSerializer.Serialize(scene);
          var stringMesh = btoa(JSON.stringify(serializedScene));
          //console.log(serializedMesh);
          var contoursData = $(".list-group").html() != "" ? $(".list-group").html() : "";
          var countContours = $('.list-group-item:visible').length > 0 ? $('.list-group-item:visible').length : 0;
          const data = {
               'id' : sessionId,
               'babylon' : stringMesh,
               'contours' : contoursData,
               'countContours' : countContours
          };
           $.ajax({
               type: 'POST',
               url: basePath+'saveSessionRecords',
               data: data,
               dataType:'json',
               success: function(response){
                    stopSpinner();
                    //console.log(response);
                    $('#messageToast').toast('show');
               },
               error: function(err){
                    console.log("Error in loading scene :: " + err);
               }
          });

          // if (filename.toLowerCase().lastIndexOf(".babylon") !== filename.length - 8 || filename.length < 9){
          //      filename += ".babylon";
          //  }
                   
          // var blob = new Blob ( [ strMesh ], { type : "octet/stream" } );
              
          //  // turn blob into an object URL; saved as a member, so can be cleaned out later
          //  objectUrl = (window.webkitURL || window.URL).createObjectURL(blob);
           
          //  var link = window.document.createElement('a');
          //  link.href = objectUrl;
          //  link.download = filename;
          //  var click = document.createEvent("MouseEvents");
          //  click.initEvent("click", true, false);
          //  link.dispatchEvent(click);
     }

     //Save the Babylon Scene
     $(document).on('click', '#loadSceneBtn', function() {
          loadSpinner();
          //BABYLON.SceneLoader.Load("/scenes/", "scene.babylon", engine, scene);
          var sceneAssetsPath = "/scenes/";
          var loadFile = "scene.json";
          /*$.getJSON(basePath+'scene.json', function(data) {
               
               const JSONobjBabylon = JSON.stringify(data);
               console.log(JSONobjBabylon);
               BABYLON.SceneLoader.ShowLoadingScreen = false;
               BABYLON.SceneLoader.Load('', 'data:'+JSONobjBabylon, engine, function (newScene) {
                    newScene.executeWhenReady(function () {
                        // Attach camera to canvas inputs
                        newScene.activeCamera.attachControl(canvas);
            
                        // Once the scene is loaded, just register a render loop to render it
                        engine.runRenderLoop(function () {
                            newScene.render();
                        });
                    });
                    stopSpinner();
                }, function (progress) {
                    // To do: give progress feedback to user
                });
          });*/

          $.ajax({
               type: 'POST',
               url: basePath+'loadscene',
               data: {'data':'1'},
               dataType:'json',
               success: function(response){
                    console.log(response);
               },
               error: function(err){
                    console.log("Error in loading scene :: " + err);
               }
           });
          
     });
     
     // Create a New Scene
     $(document).on('click', '#createNewBtn', function() {
          loadSpinner();
          let valueData = Math.round((new Date()).getTime() / 1000);
          $.ajax({
               type: 'POST',
               url: basePath+'generateSession',
               data: {'data': valueData},
               dataType:'json',
               success: function(response){
                    window.setTimeout(function(){
                         window.location.href = basePath + "?id=" + response.id;
                    }, 1000);
               },
               error: function(err){
                    console.log("Error in processing request :: " + err);
               }
          });
     });
     CreateSTL = function(mesh){
          var output = 'solid exportedMesh\r\n';
          var vertices = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
          var indices = mesh.getIndices();	
     
          for(var i = 0; i<indices.length; i+=3){
               var id = [indices[i]*3,indices[i+1]*3,indices[i+2]*3];
               var v = [
               new BABYLON.Vector3(vertices[id[0]], vertices[id[0]+1], vertices[id[0]+2]),
               new BABYLON.Vector3(vertices[id[1]], vertices[id[1]+1], vertices[id[1]+2]),
               new BABYLON.Vector3(vertices[id[2]], vertices[id[2]+1], vertices[id[2]+2])
                         ];
               var p1p2 = v[0].subtract(v[1]); 		
               var p3p2 = v[2].subtract(v[1]); 
               var n = (BABYLON.Vector3.Cross(p1p2, p3p2)).normalize();
               
               output+='facet normal '+n.x+' '+n.y+' '+n.z+'\r\n';
               output+='\touter loop\r\n';
               output+='\t\tvertex '+v[0].x+' '+v[0].y+' '+v[0].z+'\r\n';
               output+='\t\tvertex '+v[1].x+' '+v[1].y+' '+v[1].z+'\r\n';
               output+='\t\tvertex '+v[2].x+' '+v[2].y+' '+v[2].z+'\r\n';		
               output+='\tendloop\r\n';
             output+='endfacet\r\n';
          }
          output += 'endsolid exportedMesh';
          
          
          function download(content, filename, contentType)
          {
          if(!contentType) contentType = 'application/octet-stream';
               var a = document.createElement('a');
               var blob = new Blob([content], {'type':contentType});
               a.href = window.URL.createObjectURL(blob);
               a.download = filename;
               a.click();
          }
          download(output, 'mesh.stl', 'application/octet-stream');
     };
     $(document).on('click', '#downloadBtn', function() {
          // debugger
          CreateSTL(resultMesh);
          
     });

     $(document).on('click', '#drawAction', function() {
          $('#contourModal').modal('hide');
          $('#drawModal').modal('show');
          initCanvas();
          if (drawMode) {
               // stop draw mode
               activeLine = null;
               activeShape = null;
               lineArray = [];
               pointArray = [];
               canvas.selection = true;
               drawMode = false;
           } else {
               // start draw mode
               drawCanvas.selection = false;
               drawMode = true;
          }
     });

     function edit() {
          let mousePos = getMousePos(document.getElementById("drawCanvas"), event);
          let nbor = getNeighbors(mousePos.x, mousePos.y, 13);
          //drawPointsDebug(nbor)
          // console.log("NEIGHBOR ", nbor)
          for (let i = 0; i < nbor.length; i++) {
            let hval = calcHash(nbor[i][0], nbor[i][1]);
          //   console.log(hval)
            hval = parseInt(hval)
     
            if (pixelHash[hval] !== undefined) {
              lastIdx = pixelHash[hval] - 1
              state = allStates.EDIT;
              delete pixelHash[hval];
          //     console.log("PICKED")
              break
            }
          }
        }
        
        function calcHash(i, j) {
          return parseInt(document.getElementById("drawCanvas").height * i + j);
        }
        
        function getNeighbors(i, j, k) {
          i = parseInt(i)
          j = parseInt(j)
          var neighbors = [];
          //var neighborsPix = [];
          var m = document.getElementById("drawCanvas").height;
          var n = document.getElementById("drawCanvas").width;

          var d = Math.floor(k / 2);
          for (var x = Math.max(0, i - d); x <= Math.min(i + d, m - 1); x++) {
            for (var y = Math.max(0, j - d); y <= Math.min(j + d, n - 1); y++) {
              if (x !== i || y !== j) {
                neighbors.push([x, y]);
                //neighborsPix.push({x:x, y:y})
              }
            }
          }
          neighbors.push([i, j]);
          return neighbors;
          //return neighborsPix;
        }
        
        function l2dist(point1, point2) {
          // debugger
          let diffx = point1.x - point2.x;
          let diffy = point1.y - point2.y;
          let dist = diffx * diffx + diffy * diffy;
          dist = Math.sqrt(dist);
          return dist;
        }
        
        function clearCanvas() {
          const drawCanv_ = document.getElementById("drawCanvas");
          const ctxDrawCanv_ = drawCanv_.getContext("2d");
          ctxDrawCanv_.clearRect(0, 0, backgroundWidth * scale + Math.abs(transformDeltaX), backgroundHeight * scale + Math.abs(transformDeltaY));
        }
        
        function drawLines() {
          const drawCanv = document.getElementById("drawCanvas");
          const ctxDrawCanv = drawCanv.getContext("2d");
          let n = points.length; // cache the length for performance
          ctxDrawCanv.beginPath();
          for (var i = 0; i < n - 1; i++) {
               ctxDrawCanv.moveTo(points[i].x, points[i].y);
               ctxDrawCanv.lineTo(points[i + 1].x, points[i + 1].y);
          }
          if (state != allStates.DRAW) {
            ctxDrawCanv.moveTo(points[n - 1].x, points[n - 1].y);
            ctxDrawCanv.lineTo(points[0].x, points[0].y);
          }
          ctxDrawCanv.stroke();
          ctxDrawCanv.closePath();
        }
        
        function drawPoints(pointSet) {
          //console.log(pointSet)
          const drawCan = document.getElementById("drawCanvas");
          const ctxDrawCan = drawCan.getContext("2d");
          let n = pointSet.length; // cache the length for performance
          for (var i = 0; i < n; i++) {
               ctxDrawCan.beginPath();
               ctxDrawCan.arc(pointSet[i].x, pointSet[i].y, 3, 0, 2 * Math.PI);
               ctxDrawCan.fillStyle = '#3322FF';
               ctxDrawCan.fill();
               ctxDrawCan.stroke();
          }
        }

        function drawPointsDebug(pointSet) {
          //console.log(pointSet)
          const drawCan = document.getElementById("drawCanvas");
          const ctxDrawCan = drawCan.getContext("2d");
          let n = pointSet.length; // cache the length for performance
          for (var i = 0; i < n; i++) {
               ctxDrawCan.beginPath();
               ctxDrawCan.arc(pointSet[i][0], pointSet[i][1], 3, 0, 2 * Math.PI);
               ctxDrawCan.fillStyle = '#3322FF';
               ctxDrawCan.fill();
               ctxDrawCan.stroke();
          }
        }
        
        function getMousePos(drawCanvas_, event) {
          var rect = drawCanvas_.getBoundingClientRect();
          return {
            x: (event.clientX - rect.left - transformDeltaX) / scale,
            y: (event.clientY - rect.top - transformDeltaY) / scale
          };
        }
        
        // Hashing happens in draw state.
        function draw(mousePos, d) {
          if (state == allStates.DRAW) {
            if (points.length >= 2 && l2dist(mousePos, points[0]) <= pixelEpsilon && d > pixelEpsilon) {
              state = allStates.COMPLETE; // completed state
              lastMousePos.x = mousePos.x;
              lastMousePos.y = mousePos.y;
              points.pop();
              //console.log(" points array size = ", points.length)
            } else if (d > pixelEpsilon) {
              points.push({
                x: mousePos.x,
                y: mousePos.y
              });
              lastIdx = points.length - 1;
              lastMousePos.x = mousePos.x;
              lastMousePos.y = mousePos.y;
              let hashVal = calcHash(mousePos.x, mousePos.y);
              pixelHash[hashVal] = lastIdx;
              //console.log(pixelHash)
            }
            clearCanvas();
            drawPoints(points);
            if (points.length >= 2) {
              drawLines();
            }
          }
        }
        
        function populateHash(px, i) {
          let hashVal = calcHash(px.x, px.y);
          pixelHash[hashVal] = i + 1;
        }
        
        function populatePoly(pts_) {
          pixelHash = [];
          points = [];
          for (let i = 0; i < pts_.length; i++) {
            points.push(pts_[i]);
            populateHash(pts_[i], i);
          }
          clearCanvas();
          drawPoints(points);
          if (points.length >= 2) {
            drawLines();
          }
          state = allStates.COMPLETE;
          canvasEvents();
        }
        
      
     function canvasEvents(){
          if(!isCanvasEventListener){
               document.getElementById("drawCanvas").addEventListener("mousedown", function(event) {
                    // alert("DWDW")
                    //mousedn = true;
                    let mousePos = getMousePos(document.getElementById("drawCanvas"), event);
                    console.log(mousePos, event.clientX, event.clientY ,"werwerwerrwer")
                    let d = l2dist(mousePos, lastMousePos);
                    switch (state) {
                         case allStates.NOOP:
                         state = allStates.DRAW;
                         draw(mousePos, d)
                         case allStates.DRAW:
                         draw(mousePos, d);
                         break;
                         case allStates.COMPLETE:
                         edit();
                         break
                         case allStates.EDIT:
                         state = allStates.COMPLETE;
                         let hashVal = calcHash(mousePos.x, mousePos.y);
                         pixelHash[hashVal] = lastIdx + 1;
                         break;
                    }
               });
               
               document.getElementById("drawCanvas").addEventListener("mouseup", function(event) {
                    mousedn = false;
               });
               
               document.getElementById("drawCanvas").addEventListener("mousemove", function(event) {
                    let mousePos = getMousePos(document.getElementById("drawCanvas"), event);
                    const canvas = document.getElementById("drawCanvas");
                    const context = canvas.getContext("2d");
                    switch (state) {
                    case allStates.DRAW:
                    points[lastIdx].x = mousePos.x;
                    points[lastIdx].y = mousePos.y;
                    context.save();
                    context.scale(scale, scale);
                    clearCanvas();
                    drawPoints(points);
                    if (points.length >= 2) {
                         drawLines();
                    }
                    context.restore()
                    break;
                    case allStates.EDIT:
                    points[lastIdx].x = mousePos.x;
                    points[lastIdx].y = mousePos.y;
                    context.save();
                    context.scale(scale, scale);
                    clearCanvas();
                    drawPoints(points);
                    if (points.length >= 2) {
                         drawLines();
                    }
                    context.restore()
                    break
                    case allStates.COMPLETE:
                    break
                    }
               });

               document.getElementById("drawCanvas").addEventListener("wheel", function(event){
                         const ctx = document.getElementById("drawCanvas").getContext("2d");
                         
                         ctx.clearRect(0, 0, backgroundWidth * scale + Math.abs(transformDeltaX), backgroundHeight * scale + Math.abs(transformDeltaY));


                         const transform = ctx.getTransform()
                     
                       if (event.shiftKey) {
                         let detax = transform.e;
                         detax += event.deltaX / 4;
                         detax += event.deltaY / 4;
                         transformDeltaX = detax;
                         ctx.setTransform(transform.a, transform.b, transform.c, transform.d, detax, transform.f)
                       } else {
                         let deltaY = transform.f;
                         deltaY += event.deltaX / 4;
                         deltaY += event.deltaY / 4;
                         transformDeltaY = deltaY;
                         ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, deltaY)
                       }

                       handleScaleCanvas()
                       $("#drawCanvas").css({"background-position": `left ${transformDeltaX}px top ${transformDeltaY}px` });
                     
                       event.preventDefault();
                       event.stopPropagation();
               })
               isCanvasEventListener = true;
          }
     }

     $(window).on("load", function () {
          const sessionId = new URLSearchParams(window.location.search).get('id');
          window.addEventListener('resize', function () {
               engine.resize();
               camera.aspect = engine.getRenderWidth() / engine.getRenderHeight();
               camera.updateProjectionMatrix();
          });
             
          if(sessionId != "" && sessionId != null){
               loadSpinner();
               //initialiseScene();
               fetchSessionRecord(sessionId);
          }
     });

     // Fetch session records
     async function fetchSessionRecord(id = ""){
          console.log('We are fetching records!!');
          $.ajax({
               type: 'POST',
               url: basePath+'loadSessionRecords',
               data: {'id': id},
               dataType:'json',
               success: function(response){
                    stopSpinner();
                    //console.log(response.data);
                    //initialiseScene();
                    initialiseBabylon();
                    
                    if(Object.keys(response).length > 0  && Object.keys(response.data).length > 0){
                         $(".list-group").append(response.data.contours);
                         const JSONobjBabylon = atob(response.data.babylon);
                         //console.log(JSONobjBabylon);
                         BABYLON.SceneLoader.ShowLoadingScreen = false;
                         // BABYLON.SceneLoader.Append("", "data:" + JSONobjBabylon, scene, function(newScene){
                         //      //scene.dispose();
                         //      // Attach camera to canvas inputs
                         //      newScene.activeCamera.attachControl(canvas);    
                         //      engine.runRenderLoop(() => {
                         //                          newScene.render();
                         //                     });
                         //                     scene = newScene;
                         // });
                         
                         // BABYLON.SceneLoader.LoadAsync("", "data:" + JSONobjBabylon, engine, function(newScene){
                         //      newScene.executeWhenReady(function () {
                         //           //dispose the old scene
                         //           //scene.dispose();
                                   
                         //           // Attach camera to canvas inputs
                         //           newScene.activeCamera.attachControl(canvas);                                   
                         //           //show new scene
                                   
                                   
                         //           newScene.meshes.forEach(function(mesh) {
                         //                if(mesh.name === 'poly'){
                         //                     mesh.material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
                         //                     mesh.material.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
                         //                     mesh.material.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
                         //                     mesh.material.clipPlane3 = new BABYLON.Plane(0, 1, 0, -foamHeight/2);
                         //                     mesh.material.clipPlane4 = new BABYLON.Plane(0, -1, 0, -foamHeight / 2);
                         //                }
                         //           });

                         //           engine.runRenderLoop(() => {
                         //                newScene.render();
                         //           });
                         //           scene = newScene;
                         //           loadExistingBabylon();
                         //      });
                         // });
                         createSceneBabylon(JSONobjBabylon);
                         
                    }
                    else{
                         
                    }
                    // $.getJSON(basePath+'scenes/'+'scene.json', function(data) {
                    //      const JSONobjBabylon = JSON.stringify(data);
                    //      BABYLON.SceneLoader.ShowLoadingScreen = false;
                    //      BABYLON.SceneLoader.Load('', 'data:'+JSONobjBabylon, engine, function (newScene) {
                    //           newScene.executeWhenReady(function () {
                    //               // Attach camera to canvas inputs
                    //               newScene.activeCamera.attachControl(canvas);
                      
                    //               // Once the scene is loaded, just register a render loop to render it
                    //               engine.runRenderLoop(function () {
                    //                   newScene.render();
                    //               });
                    //           });
                    //       }, function (progress) {
                    //           // To do: give progress feedback to user
                    //       });
                    // });
               },
               error: function(err){
                    console.log("Error in processing request :: " + err);
               }
          });
          
     }
     async function createSceneBabylon(JSONobjBabylon){
          scene = await BABYLON.SceneLoader.LoadAsync("", "data:" + JSONobjBabylon, engine);
          scene.activeCamera.attachControl(canvas);
          let pointerDragBehavior_T = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 1, 0) });
          pointerDragBehavior_T.useObjectOrientationForDragging = false;
          var utilLayer_ = new BABYLON.UtilityLayerRenderer(scene);

          let gizmoRot_ = new BABYLON.PlaneRotationGizmo (new BABYLON.Vector3(0,1,0), BABYLON.Color3.FromHexString("#00b894"), utilLayer_);
          gizmoRot_.updateGizmoRotationToMatchAttachedMesh = true;
          gizmoRot_.updateGizmoPositionToMatchAttachedMesh = true;

          //configuration of the scaling gizmo for the meshes
          let gizmoScale_ = new BABYLON.ScaleGizmo(utilLayer, 1, gizmo)
          gizmoScale_.updateGizmoPositionToMatchAttachedMesh = true;
          gizmoScale_.updateGizmoRotationToMatchAttachedMesh = true;
          gizmoScale_.yGizmo.isEnabled = false;

          let axisScaleGizmo_ = new BABYLON.AxisScaleGizmo(new BABYLON.Vector3(1, 0, 1))
          axisScaleGizmo_.updateGizmoPositionToMatchAttachedMesh = true;
          axisScaleGizmo_.updateGizmoRotationToMatchAttachedMesh = true;

          scene.meshes.forEach(function(mesh) {
               // gizmo.attachToMesh(mesh)
               // pointerDragBehavior_z.attach(mesh)
               // debugger
               console.log(mesh.name)
               if(mesh.name.includes('poly')){
                    // debugger
                    mesh.material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
                    // pointerDragBehavior_T.attach(mesh)
                    // console.log(mesh.name)
                    // gizmoRot_.attachedMesh = mesh;

                    // mesh.material.clipPlane = new BABYLON.Plane(1, 0, 0, -foamWidth/2);
                    // mesh.material.clipPlane2 = new BABYLON.Plane(-1, 0, 0, -foamWidth/2);
                    // mesh.material.clipPlane3 = new BABYLON.Plane(0, 1, 0, -foamHeight/2);
                    // mesh.material.clipPlane4 = new BABYLON.Plane(0, -1, 0, -foamHeight / 2);
               }
          });
          
          pointerDragBehavior_T.onDragStartObservable.add((event)=>{
               let mat_ = event.pointerInfo.pickInfo.pickedMesh.getWorldMatrix();
               let savedMat = createMat(mat_);
               statehash.id = event.pointerInfo.pickInfo.pickedMesh.uniqueId;
               statehash.mprev = savedMat;

          });
          pointerDragBehavior_T.onDragEndObservable.add((event)=>{
               let mat_ = event.pointerInfo.pickInfo.pickedMesh.getWorldMatrix();
               let currentMat = createMat(mat_);
               statehash.m = currentMat;
               undo.push({...statehash})
               console.log(undo);
          });
          gizmoRot_.dragBehavior.onDragStartObservable.add((event) => {
               let mockid = uniqueIDRef
               let mat_ = scene.getMeshByUniqueId(mockid).getWorldMatrix();
               let savedMat = createMat(mat_);
               rotateHash.id = mockid;
               rotateHash.mprev = savedMat;
           });
       
          gizmoRot_.dragBehavior.onDragEndObservable.add((event) => {
               let mockid = uniqueIDRef
               let mat_ =  scene.getMeshByUniqueId(mockid).getWorldMatrix();
               let currentMat = createMat(mat_);
               rotateHash.m = currentMat;
               if(undo.length > 0 && redo.length > 0){
                    redo = []
               }
               undo.push({...rotateHash})
               console.log(undo)
          });
          scene.onPointerObservable.add((pointerInfo) => {
               switch (pointerInfo.type) {
                    case BABYLON.PointerEventTypes.POINTERDOWN:
                         // debugger
                         if (pointerInfo.pickInfo.hit && (pointerInfo.pickInfo.pickedMesh.name == "box" || pointerInfo.pickInfo.pickedMesh.name.includes("poly")) || pointerInfo.pickInfo.pickedMesh.name == "Cylinder") {
                              // debugger;
                              let mesh = pointerInfo.pickInfo.pickedMesh;
                              mesh.setBoundingInfo()
                              // debugger;
                              uniqueIDRef = mesh.uniqueId
                              pointerDragBehavior_T.attach(mesh)
                              createDepthInputOnSelectedMesh(mesh)
                              if(mesh.name.includes("Cylinder")){
                                   axisScaleGizmo_.attachedMesh = mesh;
                                   gizmoScale_.attachedMesh = null;
                              }else {
                                   axisScaleGizmo_.attachedMesh = null;
                                   gizmoScale_.attachedMesh = mesh;
                              }

                              console.log(mesh.name)
                              //gizmo.attachedMesh = mesh;
                         }else{
                              gizmoRot_.attachedMesh = null;
                              gizmoScale_.attachedMesh = null;
                              axisScaleGizmo_.attachedMesh = null;
                              meshDepthGUI.getChildren().map((item) => {
                                   item.isVisible = false
                              })
                         }
                    break;
               }
          });
          
          loadExistingBabylon();
     }
     function initialiseScene(){
          var scene = createScene();
          engine.runRenderLoop(function() {
               scene.render();
          });
     }

     function loadSpinner(delay = ""){
          if(delay != ""){
               $("#spinner").find('> div > span').text('Please wait while we process your request...').end().show().delay(delay).fadeOut();
          } else {
               $("#spinner").find('> div > span').text('Please wait while we process your request...').end().show();
          } 
          
     }
     function stopSpinner(){
          $("#spinner").find('> div > span').text('Please wait while we process your request...').end().hide();
     }

     // var scene = createScene();
     // engine.runRenderLoop(function() {
     //      scene.render();
     // });
});