



//=============================================================================

function addEventListener(obj, event, event2, callback)
{
    if (obj.addEventListener && event) {
	obj.addEventListener(event, callback, false);
    } else if (event2)
	obj.attachEvent(event2, callback);
}



// Event handler for mouse wheel event.
function calcMouseWheelDelta(event){
    var delta = 0;
    if (!event) /* For IE. */
        event = window.event;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta/120;
	
        // In Opera 9, delta differs in sign as compared to IE.
        if (window.opera)
            delta = -delta;
    } else if (event.detail) { /** Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        delta = -event.detail;
    }
    return delta;
}


//=============================================================================
// graphics primatives


function Group(children)
{
    Group.prototype.kind = "group";
    this.parent = null;
    this.children = children;

    Group.prototype.push = function push(x) {
        if (x.parent != null)
            throw "Element already has parent";
	x.parent = this;
	this.children.push(x);
	return x;
    };

    Group.prototype.remove = function remove(x) {
	var i = this.children.indexOf(x);
	this.children.splice(i, 1);
    };

    Group.prototype.replace = function replace(oldGrp, newGrp) {
	var i = this.children.indexOf(x);
        this.children[i].parent = null;
        this.children[i] = newGrp;
    }
}

function Translate(x, y, children)
{
    Translate.prototype.kind = "translate";
    this.parent = null;
    this.children = children;
    this.data = [x, y];
}

function Scale(x, y, children)
{
    Scale.prototype.kind = "scale";
    this.parent = null;
    this.children = children;
    this.data = [x, y];    
}

function Rotate(r, children)
{
    Rotate.prototype.kind = "rotate";
    this.parent = null;
    this.children = children;
    this.data = [r];    
}


function Graphic(kind, data)
{
    this.kind = kind;
    this.parent = null;
    this.data = data;

    Graphic.prototype.push = function push(x) {
	this.data.push(x);
    };
    Graphic.prototype.removeSelf = function removeSelf() {
        this.parent.remove(this);
    }
}

function group()
{
    return new Group(Array.prototype.slice.call(arguments));
}


// graphic functions

function lines()
{
    return new Graphic("lines", 
		       Array.prototype.slice.call(arguments));
}

function lineStrip()
{
    return new Graphic("lineStrip", 
		       Array.prototype.slice.call(arguments));
}

function triangles()
{
    return new Graphic("triangles",
		       Array.prototype.slice.call(arguments));
}

function quads()
{
    return new Graphic("quads", 
		       Array.prototype.slice.call(arguments));
}

function polygon()
{
    return new Graphic("polygon", 
		       Array.prototype.slice.call(arguments));    
}


function style(data)
{
    return {kind: "style",
	    data: data};
}



// transform functions

function translate(x, y)
{
    return new Translate(x, y, Array.prototype.slice.call(arguments, 2, arguments.length));
}

function scale(x, y)
{
    return new Scale(x, y, Array.prototype.slice.call(arguments, 2, arguments.length));
}

function rotate(r)
{
    return new Rotate(r, Array.prototype.slice.call(arguments, 1, arguments.length));
}




//=============================================================================


// create the Summon namespace
var Summon = Summon || {


// keycodes
    KEY_RIGHT: 39,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_DOWN: 40,



Camera: function Camera()
{
    this.trans = [0, 0];
    this.zoom = [1, 1];
    this.focus = [0, 0];
},


Canvas: function Canvas(canvas)
{
    var that = this;
    var c = canvas.getContext("2d");
    var camera = new Summon.Camera();
    var bindings = {keydown: {}, 
                    keyup: {},
                    mouse: {}};

    // mouse info
    var mouseState = "up";
    var mousePt = [0, 0];

    // models
    this.world = group();


    function mouseMove(e)
    {
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;

	if (mouseState == "down") {
	    dx = x - mousePt[0];
	    dy = y - mousePt[1];
	    camera.trans[0] += dx;
	    camera.trans[1] += dy;
            mousePt = [x, y];
	    that.draw();
	} else {
            mousePt = [x, y];
        }   
    }

    function mouseDown(e)
    {
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;

	mouseState = "down";
	mousePt = [x, y];
    }

    function mouseUp(e)
    {
	mouseState = "up";
    }


    function mouseWheel(e)
    {
	var delta = calcMouseWheelDelta(e);

        // lookup callback
        var func = bindings.mouse["wheel"];
        if (func) 
            func(e, delta);

        // Prevent default actions caused by mouse wheel.
        if (e.preventDefault)
            e.preventDefault();
	e.returnValue = false;
    }


    function keyDown(e)
    {
        var charCode = e.which;
        var charStr = String.fromCharCode(charCode);

        // lookup by charCode
        var func = bindings.keydown["code" + charCode];
        if (func) 
            return func();

        // lookup by charStr
        func = bindings.keydown[charStr];
        if (func) 
            return func();
    }
    
    //======================================================================
    // coordinate conversions
    
    function windowToWorld(x, y)
    {
	return [(x - camera.trans[0] - camera.focus[0]) / camera.zoom[0] +
		camera.focus[0],
		(y - camera.trans[1] - camera.focus[1]) / camera.zoom[1] +
		camera.focus[1]];
    }


    function getCameraTransmat()
    {	    
	var transmat = makeIdentityMatrix();

	// perform translation
	transmat = multTransMatrix(transmat, camera.trans[0], camera.trans[1]);
	
	// perform zoom with respect to focus point
	transmat = multTransMatrix(transmat, camera.focus[0], camera.focus[1]);
	transmat = multScaleMatrix(transmat, camera.zoom[0], camera.zoom[1]);
	transmat = multTransMatrix(transmat, -camera.focus[0], -camera.focus[1]);
	return transmat;
    }


    //======================================================================
    // drawing methods

    function transformWorld()
    {
	c.lineWidth = 1 / Math.max(camera.zoom[0], camera.zoom[1]);

	// perform translation
	c.translate(camera.trans[0], camera.trans[1]);
	
	// perform zoom with respect to focus point
	c.translate(camera.focus[0], camera.focus[1]);
	c.scale(camera.zoom[0], camera.zoom[1]);
	c.translate(-camera.focus[0], -camera.focus[1]);
    }


    //======================================================================
    // model methods

    this.clearDrawing = function() {
	c.clearRect(0, 0, canvas.width, canvas.height);
    };

    this.add = function(grp) {
	that.world.push(grp);
	return grp;
    };

    this.remove = function(grp) {
	parent = grp.parent;
	parent.remove(grp);
    };

    this.clear = function(grp) {
        that.world = group();
    };


    //=====================================================================
    // drawing methods

    this.draw = function() {
	that.clearDrawing();

	c.save();
	//transformWorld();

	Summon.drawElements(c, that.world, getCameraTransmat());
	c.restore();
    };

    //=======================
    // camera methods

    this.translate = function(x, y) {
	camera.trans[0] -= x;
	camera.trans[1] -= y;
    };

    this.zoom = function(x, y) {
	camera.zoom[0] *= x;
	camera.zoom[1] *= y;
    };

    this.focus = function(x, y) {
        if (arguments.length == 0) {
	    pt = windowToWorld(mousePt[0], mousePt[1]);
	    x = pt[0]; y = pt[1];
        }

	camera.trans[0] += (camera.focus[0]-x) * (1.0 - camera.zoom[0]);
	camera.trans[1] += (camera.focus[1]-y) * (1.0 - camera.zoom[1]);
	camera.focus[0] = x;
	camera.focus[1] = y;
    };

    this.focusWindow = function(x, y) {
	pt = windowToWorld(x, y);
	this.focus(pt[0], pt[1]);
    };

    this.doTranslate = function(x, y) {
        return function() {
            that.translate(x, y);
            that.draw();
        };
    };

    this.doZoom = function(x, y) {
        return function() {
            that.focusWindow(canvas.width/2, canvas.height/2);
            that.zoom(x, y);
            that.draw();
        };
    };


    this.mouseWheelDefault = function(e, delta) {
	if (delta) {
            var pt = windowToWorld(mousePt[0], mousePt[1]);
	    that.focus(pt[0], pt[1]);

	    var zoom = 1.0;
	    if (delta > 0)
		zoom = Math.pow(1.1, delta);
	    else
		zoom = 1.0 / Math.pow(1.1, -delta);

	    if (e.shiftKey)
		that.zoom(1.0, zoom);
	    else if (e.ctrlKey)
		that.zoom(zoom, 1.0);
	    else
		that.zoom(zoom, zoom);
	    that.draw();
	}        
    }


    this.getSize = function() {
        return [canvas.width, canvas.height];
    };

    this.setVisible = function(x1, y1, x2, y2, mode)
    {
        // ensure coordinates are properly ordered
        if (x1 > x2) {
            var t = x1; x1 = x2; x2 = t;
        }
        if (y1 > y2) {
            var t = y1; y1 = y2; y2 = t;
        }

        // do not allow empty bounding box
        if (x1 == x2 || y1 == y2)
            throw "can't set visible to an empty bounding box";

        // get window dimensions
        var winsize = this.getSize();
        
        // do nothing if window has zero width or height
        if (winsize[0] == 0 || winsize[1] == 0)
            return;
        
        // set visible according to mode
        //if (mode == "exact") {
        camera.focus = [x1, y1];
        camera.zoom = [winsize[0] / (x2 - x1), winsize[1] / (y2 - y1)];
        camera.trans = [-x1, -y1];
        this.draw();
    }


    this.setBinding = function(input, func) {
        if (input[0] == "keydown") {
            if (typeof input[1] == "number") {
                input[1] = "code" + input[1];
            }
            
            bindings.keydown[input[1]] = func;
        } else {
            bindings[input[0]][input[1]] = func;
        }
    };


    this.setDefaultBindings = function() {
        this.setBinding(["keydown", Summon.KEY_RIGHT],this.doTranslate(100, 0));
        this.setBinding(["keydown", Summon.KEY_LEFT],this.doTranslate(-100, 0));
        this.setBinding(["keydown", Summon.KEY_UP],this.doTranslate(0, -100));
        this.setBinding(["keydown", Summon.KEY_DOWN],this.doTranslate(0, 100));

        this.setBinding(["keydown", "A"], this.doZoom(1.2, 1.2));
        this.setBinding(["keydown", "Z"], this.doZoom(1/1.2, 1/1.2));

        this.setBinding(["mouse", "wheel"], this.mouseWheelDefault);
    }


    //================
    // init
    addEventListener(canvas, "mousemove", "onmousemove", mouseMove)
    addEventListener(canvas, "mousedown", "onmousedown", mouseDown)
    addEventListener(canvas, "mouseup", "onmouseup", mouseUp)
    addEventListener(canvas, "DOMMouseScroll", "onmousewheel", mouseWheel)
    addEventListener(canvas, "mousewheel", "", mouseWheel)

    canvas.onkeydown = keyDown;

    canvas.tabIndex = 1;

    // default bindings
    this.setDefaultBindings();

    c.strokeStyle = c.fillStyle = "black";
},



// Draws group of elements 'grp' on a context 'c'
drawElements: function drawElements(c, grp, transmat)
{

    var elm = grp.kind;
    var v;
    var m = transmat;
    var m0, m1, m2, m3, m4, m5;
    if (!transmat) {
	transmat = makeIdentityMatrix();
    }


    if (elm == "group") {
	c.save();
	for (var i=0; i<grp.children.length; i++)
	    drawElements(c, grp.children[i], transmat);
	c.restore();

    // graphical elements
    } else if (elm == "lines") {
        c.beginPath();
	d = grp.data;
	m0 = m[0]; m1=m[1]; m2=m[2]; m3=m[3]; m4=m[4]; m5=m[5];	

        for (var i=0; i<d.length; i+=4) {
            c.moveTo(d[i]*m0 + d[i+1]*m1 + m2,
	             d[i]*m3 + d[i+1]*m4 + m5)
            c.lineTo(d[i+2]*m0 + d[i+3]*m1 + m2,
                     d[i+2]*m3 + d[i+3]*m4 + m5)
        }
        c.stroke();
        c.closePath();

    } else if (elm == "lineStrip") {
        c.beginPath();
	d = grp.data;
	m0 = m[0]; m1=m[1]; m2=m[2]; m3=m[3]; m4=m[4]; m5=m[5];	

        c.moveTo(d[0]*m0 + d[1]*m1 + m2,
	         d[0]*m3 + d[1]*m4 + m5)
        for (var i=2; i<d.length; i+=2) {
            c.lineTo(d[i]*m0 + d[i+1]*m1 + m2,
                     d[i]*m3 + d[i+1]*m4 + m5)
        }
        c.stroke();
        c.closePath();

    } else if (elm == "triangles") {
        c.beginPath();
	d = grp.data;
        for (var i=0; i<d.length; i+=6) {
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.moveTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+2], d[i+3]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+4], d[i+5]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.lineTo(v[0], v[1]);
        }
        c.fill();
        c.closePath();	
	
    } else if (elm == "quads") {
        c.beginPath();
	d = grp.data;
        for (var i=0; i<d.length; i+=8) {
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.moveTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+2], d[i+3]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+4], d[i+5]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+6], d[i+7]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.lineTo(v[0], v[1]);
        }
        c.fill();
        c.closePath();	

    } else if (elm == "polygon") {
        c.beginPath();
	d = grp.data;
	v = multVecMatrix(transmat, d[0], d[1]);
        c.moveTo(v[0], v[1]);
        for (var i=2; i<d.length; i+=2) {
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.lineTo(v[0], v[1]);
        }
	v = multVecMatrix(transmat, d[0], d[1]);
        c.lineTo(v[0], v[1]);
        c.fill();
        c.closePath();


    // styles
    } else if (elm == "style") {
	for (var key in grp.data) {
	    if (key == "stroke")
		c.strokeStyle = grp.data[key];
	    else if (key == "fill")
		c.fillStyle = grp.data[key];
	}

    // transformations
    } else if (elm == "translate") {
        c.save();
	var transmat2 = multTransMatrix(transmat, grp.data[0], grp.data[1]);
        //c.translate(grp.data[0], grp.data[1]);
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i], transmat2);
        c.restore();

    } else if (elm == "rotate") {
        c.save();
        //c.rotate(grp.data[0] * Math.PI / 180);
        var transmat2 = multRotateMatrix(transmat, grp.data[0]);
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i], transmat2);
        c.restore();

    } else if (elm == "scale") {
        c.save();
	var transmat2 = multScaleMatrix(transmat, grp.data[0], grp.data[1]);
        //c.scale(grp.data[0], grp.data[1]);
	//c.lineWidth /= Math.min(grp.data[0], grp.data[1]);
	
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i], transmat2);
        c.restore();


    } else {
	throw "unknown element: " + elm;
    }
},




};


/*

{

    var mouseMove = function(e)
    {
	if (mouseState == "down") {
            x = e.clientX;
            y = e.clientY;
            x -= canvas.offsetLeft;
            y -= canvas.offsetTop;
            c.lineTo(x, y);
            c.stroke();
            c.moveTo(x, y);
	}
    }

    var mouseDown = function(e)
    {
	mouseState = "down";
	c.beginPath();
	c.moveTo(e.clientX, e.clientY);
    }

    var mouseUp = function(e)
    {
	mouseState = "up";
	c.stroke();
	c.closePath();
    }


}

*/



//=============================================================================
// transforms




function makeTransMatrix(x, y)
{
    return [1, 0, x,
	    0, 1, y,
	    0, 0, 1];
}

function makeRotateMatrix(r)
{
    var s = Math.sin(r * (Math.PI/180.0));
    var c = Math.cos(r * (Math.PI/180.0));
    return [c, -s, 0,
	    s, c, 0,
	    0, 0, 1];
}

function makeScaleMatrix(x, y)
{
    return [x, 0, 0,
	    0, y, 0,
	    0 ,0, 1];
}


function makeIdentityMatrix()
{
    return [1, 0, 0,
	    0, 1, 0,
	    0, 0, 1];
}


function multMatrix(a, b)
{
/*
0 1 2
3 4 5
6 7 8
*/
    return [a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
	    a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
	    a[0]*b[2] + a[1]*b[5] + a[2]*b[8],

	    a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
	    a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
	    a[3]*b[2] + a[4]*b[5] + a[5]*b[8],

	    a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
	    a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
	    a[6]*b[2] + a[7]*b[5] + a[8]*b[8]];
}


function multTransMatrix(m, x, y)
{
/* 
   0 1 2
   3 4 5
   6 7 8

   0  1  2  3
   4  5  6  7
   8  9  10 11
   12 13 14 15
*/
    return [m[0],
	    m[1],
	    m[0]*x + m[1]*y + m[2],

	    m[3],
	    m[4],
	    m[3]*x + m[4]*y + m[5],

	    m[6],
	    m[7],
	    m[6]*x + m[7]*y + m[8]];
}


function multRotateMatrix(m, r)
{
/* 
   0 1 2
   3 4 5
   6 7 8
*/

    var s = Math.sin(r * (Math.PI/180.0));
    var o = Math.cos(r * (Math.PI/180.0));
    
    return [
        m[0] * o + m[1] * s,
        m[1] * o - m[0] * s,
        m[2],

        m[3] * o + m[4] * s,
        m[4] * o - m[3] * s,
        m[5],

        m[6] * o + m[7] * s,
        m[7] * o - m[6] * s,
        m[8]];
}



function multScaleMatrix(m, x, y)
{
/* 
   0 1 2
   3 4 5
   6 7 8
*/
    return [m[0]*x, m[1]*y, m[2],
	    m[3]*x, m[4]*y, m[5],
	    m[6]*x, m[7]*y, m[8]];
	    
}


function multVecMatrix(m, x, y)
{
/*
0 1 2
3 4 5
6 7 8
*/
    return [x*m[0] + y*m[1] + m[2],
	    x*m[3] + y*m[4] + m[5]];
}

