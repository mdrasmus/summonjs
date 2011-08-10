

// include
//document.write('<script language="JavaScript" src="canvastext.js"></script>');


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


function findGroupBounding(transmat, camera, boundbox) 
{
    // boundbox = [left, bottom, right, top];
    for (var i=0; i<this.children.length; i++) {
        var child = this.children[i];
        child.findBounding(transmat, camera, boundbox); 
    }
};



function Group(children)
{
    this.parent = null;
    this.children = children;
}
Group.prototype.kind = "group";
Group.prototype.findBounding = findGroupBounding;


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
};



function Translate(x, y, children)
{
    this.parent = null;
    this.children = children;
    this.data = [x, y];
}
Translate.prototype.kind = "translate";
Translate.prototype.findBounding = findGroupBounding;

function Scale(x, y, children)
{
    this.parent = null;
    this.children = children;
    this.data = [x, y];    
}
Scale.prototype.kind = "scale";
Scale.prototype.findBounding = findGroupBounding;

function Rotate(r, children)
{
    this.parent = null;
    this.children = children;
    this.data = [r];    
}
Rotate.prototype.kind = "rotate";
Rotate.prototype.findBounding = findGroupBounding;


function Graphic(kind, data)
{
    this.kind = kind;
    this.parent = null;
    this.data = data;
}

Graphic.prototype.push = function push(x) {
    this.data.push(x);
};

Graphic.prototype.removeSelf = function removeSelf() {
    this.parent.remove(this);
};

Graphic.prototype.findBounding = function findBounding(
    transmat, camera, boundbox) 
{
    // boundbox = [left, bottom, right, top];
    for (var i=0; i<this.data.length; i++) {
        var v = multVecMatrix(transmat, this.data[i], this.data[i+1]);
        if (v[0] < boundbox[0]) boundbox[0] = v[0];
        if (v[0] > boundbox[2]) boundbox[2] = v[0];
        if (v[1] < boundbox[1]) boundbox[1] = v[1];
        if (v[1] > boundbox[3]) boundbox[3] = v[1];
    }
};

Graphic.prototype.findBounding = findGroupBounding;


function TextLabel(text, x1, y1, x2, y2, options)
{
    this.kind = "textLabel";
    this.parent = null;
    this.data = [x1, y1, x2, y2];
    this.text = text;
    this.options = options;
}
TextLabel.prototype.findBounding = Graphic.prototype.findBounding;
TextLabel.prototype.findBounding = findGroupBounding;


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


function textLabel(text, x1, y1, x2, y2, options)
{
    if (arguments.length < 6)
        options = {};  // default options
    return new TextLabel(text, x1, y1, x2, y2, options);
}

function style(options)
{
    var style = new Graphic("style", []);
    style.options = options;
    return style;
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


    function getWindowMousePoint(e)
    {
        return [e.clientX - canvas.offsetLeft,
                e.clientY - canvas.offsetTop];
    }

    function getScreenMousePoint(e)
    {
        return [e.clientX - canvas.offsetLeft,
                canvas.height - e.clientY + canvas.offsetTop];
    }

    function mouseMove(e)
    {
        var pt = getScreenMousePoint(e);

	if (mouseState == "down") {
	    dx = pt[0] - mousePt[0];
	    dy = pt[1] - mousePt[1];
	    camera.trans[0] += dx;
	    camera.trans[1] += dy;
            mousePt = pt;
	    that.draw();
	} else {
            mousePt = pt;
        }   
    }

    function mouseDown(e)
    {
	mouseState = "down";
	mousePt = getScreenMousePoint(e);
    }

    function mouseUp(e)
    {
	mouseState = "up";
    }


    function mouseWheel(e)
    {
	var delta = calcMouseWheelDelta(e);
        var mod = getKeyMod(e);

        // lookup callback
        var func = bindings.mouse["wheel" + mod];
        if (func) 
            func(delta);

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
    
    function screenToWorld(x, y)
    {
	return [(x - camera.trans[0] - camera.focus[0]) / camera.zoom[0] +
		camera.focus[0],
		(y - camera.trans[1] - camera.focus[1]) / camera.zoom[1] +
		camera.focus[1]];
    }

    function windowToScreen(x, y)
    {
        return [x, canvas.height - y];
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
        c.translate(0, canvas.height);
        c.scale(1, -1);
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
	    pt = screenToWorld(mousePt[0], mousePt[1]);
	    x = pt[0]; y = pt[1];
        }

	camera.trans[0] += (camera.focus[0]-x) * (1.0 - camera.zoom[0]);
	camera.trans[1] += (camera.focus[1]-y) * (1.0 - camera.zoom[1]);
	camera.focus[0] = x;
	camera.focus[1] = y;
    };

    this.focusWindow = function(x, y) {
	var pt = screenToWorld(x, y);
	this.focus(pt[0], pt[1]);
    };

    this.doTranslate = function(x, y) {
        return function() {
            that.translate(x, y);
            that.draw();
        };
    };

    this.doZoom = function(x, y, mode) {
        var mode = (arguments.length > 2) ? arguments[2] : "center";
        return function() {
            if (mode == "center") {
                that.focusWindow(canvas.width/2, canvas.height/2);
            } else if (mode == "mouse") {
                that.focusWindow(mousePt[0], mousePt[1]);
            }
            that.zoom(x, y);
            that.draw();
        };
    };


    this.doMouseWheel = function(x, y) {
        return function(delta) {
            var z = Math.pow(1.1, delta);
            that.focusWindow(mousePt[0], mousePt[1]);
            if (x && y)
                that.zoom(z, z);
            else if (x)
                that.zoom(z, 1);
            else if (y)
                that.zoom(1, z);
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
    };


    this.home = function() {
        var transmat = getCameraTransmat();
        var boundbox = [Infinity, Infinity, -Infinity, -Infinity];
        this.world.findBounding(transmat, this.camera, boundbox);
        this.setVisible(boundbox[0], boundbox[1], boundbox[2], boundbox[3]);
    };


    function parseKeyMod(input) {
        var mod = "";
        if (input.indexOf("shift") != -1) 
            mod += "+shift";
        if (input.indexOf("ctrl") != -1) 
            mod += "+ctrl";
        return mod;
    }

    function getKeyMod(e) {
        var mod = "";
	if (e.shiftKey)
	    mod += "+shift";
	else if (e.ctrlKey)
	    mod += "+ctrl";
        return mod;
    }


    this.setBinding = function(input, func) {
        if (input[0] == "keydown") {
            if (typeof input[1] == "number") {
                input[1] = "code" + input[1];
            }
            
            bindings.keydown[input[1]] = func;
        } else if (input[0] == "mouse") {
            var mod = parseKeyMod(input.slice(2));
            bindings[input[0]][input[1] + mod] = func;
        } else {
            throw "unknown input " + input
        }
    };


    this.setDefaultBindings = function() {
        this.setBinding(["keydown", Summon.KEY_RIGHT],this.doTranslate(100, 0));
        this.setBinding(["keydown", Summon.KEY_LEFT],this.doTranslate(-100, 0));
        this.setBinding(["keydown", Summon.KEY_UP],this.doTranslate(0, -100));
        this.setBinding(["keydown", Summon.KEY_DOWN],this.doTranslate(0, 100));

        this.setBinding(["keydown", "A"], this.doZoom(1.2, 1.2));
        this.setBinding(["keydown", "Z"], this.doZoom(1/1.2, 1/1.2));

        this.setBinding(["mouse", "wheel"], this.doMouseWheel(true, true));
        this.setBinding(["mouse", "wheel", "shift"], 
                        this.doMouseWheel(false, true));
        this.setBinding(["mouse", "wheel", "ctrl"], 
                        this.doMouseWheel(true, false));
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
    Summon.Text.enable(c);

    // default bindings
    this.setDefaultBindings();

    c.strokeStyle = c.fillStyle = "black";
},



// Draws group of elements 'grp' on a context 'c'
drawElements: function drawElements(c, grp, transmat)
{

    var elm = grp.kind;
    var v;
    var m0, m1, m2, m3, m4, m5;
    if (!transmat)
	transmat = makeIdentityMatrix();
    var m = transmat;

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

    } else if (elm == "textLabel") {
        var font = "";
        d = grp.data;
        var text = grp.text;
        var options = grp.options;
        var textWidth = d[2] - d[0];
        var textHeight = d[3] - d[1];
        var textWidth2 = c.measureText(font, textHeight, text);
        var transmat2 = multScaleMatrix(multTransMatrix(transmat, d[0], d[1]), 
                                        textWidth / textWidth2, -1);
        if (options.minsize) {
            var zoom = getMatrixZoom(transmat2);
            if (zoom[0]*textWidth2 < options.minsize ||
                zoom[1]*textHeight < options.minsize)
                return;
        }

        c.drawText(font, textHeight, 0, 0, text, transmat2);


    // styles
    } else if (elm == "style") {
	for (var key in grp.options) {
	    if (key == "stroke")
		c.strokeStyle = grp.options[key];
	    else if (key == "fill")
		c.fillStyle = grp.options[key];
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


function getMatrixZoom(m)
{
    return [Math.sqrt(m[0]*m[0] + m[3]*m[3]),
            Math.sqrt(m[1]*m[1] + m[4]*m[4])];
}



//=============================================================================
// Canvas text

//
// This code is adapted from CanvasText.js, which was original released
//  to the public domain by Jim Studt, 2007.
// He may keep some sort of up to date copy at 
// http://www.federated.com/~jim/canvastext/
//
Summon.Text = { };

Summon.Text.letters = {
	' ': { width: 16, points: [] },
	'!': { width: 10, points: [[5,21],[5,7],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
	'"': { width: 16, points: [[4,21],[4,14],[-1,-1],[12,21],[12,14]] },
	'#': { width: 21, points: [[11,25],[4,-7],[-1,-1],[17,25],[10,-7],[-1,-1],[4,12],[18,12],[-1,-1],[3,6],[17,6]] },
	'$': { width: 20, points: [[8,25],[8,-4],[-1,-1],[12,25],[12,-4],[-1,-1],[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
	'%': { width: 24, points: [[21,21],[3,0],[-1,-1],[8,21],[10,19],[10,17],[9,15],[7,14],[5,14],[3,16],[3,18],[4,20],[6,21],[8,21],[10,20],[13,19],[16,19],[19,20],[21,21],[-1,-1],[17,7],[15,6],[14,4],[14,2],[16,0],[18,0],[20,1],[21,3],[21,5],[19,7],[17,7]] },
	'&': { width: 26, points: [[23,12],[23,13],[22,14],[21,14],[20,13],[19,11],[17,6],[15,3],[13,1],[11,0],[7,0],[5,1],[4,2],[3,4],[3,6],[4,8],[5,9],[12,13],[13,14],[14,16],[14,18],[13,20],[11,21],[9,20],[8,18],[8,16],[9,13],[11,10],[16,3],[18,1],[20,0],[22,0],[23,1],[23,2]] },
	'\'': { width: 10, points: [[5,19],[4,20],[5,21],[6,20],[6,18],[5,16],[4,15]] },
	'(': { width: 14, points: [[11,25],[9,23],[7,20],[5,16],[4,11],[4,7],[5,2],[7,-2],[9,-5],[11,-7]] },
	')': { width: 14, points: [[3,25],[5,23],[7,20],[9,16],[10,11],[10,7],[9,2],[7,-2],[5,-5],[3,-7]] },
	'*': { width: 16, points: [[8,21],[8,9],[-1,-1],[3,18],[13,12],[-1,-1],[13,18],[3,12]] },
	'+': { width: 26, points: [[13,18],[13,0],[-1,-1],[4,9],[22,9]] },
	',': { width: 10, points: [[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
	'-': { width: 26, points: [[4,9],[22,9]] },
	'.': { width: 10, points: [[5,2],[4,1],[5,0],[6,1],[5,2]] },
	'/': { width: 22, points: [[20,25],[2,-7]] },
	'0': { width: 20, points: [[9,21],[6,20],[4,17],[3,12],[3,9],[4,4],[6,1],[9,0],[11,0],[14,1],[16,4],[17,9],[17,12],[16,17],[14,20],[11,21],[9,21]] },
	'1': { width: 20, points: [[6,17],[8,18],[11,21],[11,0]] },
	'2': { width: 20, points: [[4,16],[4,17],[5,19],[6,20],[8,21],[12,21],[14,20],[15,19],[16,17],[16,15],[15,13],[13,10],[3,0],[17,0]] },
	'3': { width: 20, points: [[5,21],[16,21],[10,13],[13,13],[15,12],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
	'4': { width: 20, points: [[13,21],[3,7],[18,7],[-1,-1],[13,21],[13,0]] },
	'5': { width: 20, points: [[15,21],[5,21],[4,12],[5,13],[8,14],[11,14],[14,13],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
	'6': { width: 20, points: [[16,18],[15,20],[12,21],[10,21],[7,20],[5,17],[4,12],[4,7],[5,3],[7,1],[10,0],[11,0],[14,1],[16,3],[17,6],[17,7],[16,10],[14,12],[11,13],[10,13],[7,12],[5,10],[4,7]] },
	'7': { width: 20, points: [[17,21],[7,0],[-1,-1],[3,21],[17,21]] },
	'8': { width: 20, points: [[8,21],[5,20],[4,18],[4,16],[5,14],[7,13],[11,12],[14,11],[16,9],[17,7],[17,4],[16,2],[15,1],[12,0],[8,0],[5,1],[4,2],[3,4],[3,7],[4,9],[6,11],[9,12],[13,13],[15,14],[16,16],[16,18],[15,20],[12,21],[8,21]] },
	'9': { width: 20, points: [[16,14],[15,11],[13,9],[10,8],[9,8],[6,9],[4,11],[3,14],[3,15],[4,18],[6,20],[9,21],[10,21],[13,20],[15,18],[16,14],[16,9],[15,4],[13,1],[10,0],[8,0],[5,1],[4,3]] },
	':': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
	',': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
	'<': { width: 24, points: [[20,18],[4,9],[20,0]] },
	'=': { width: 26, points: [[4,12],[22,12],[-1,-1],[4,6],[22,6]] },
	'>': { width: 24, points: [[4,18],[20,9],[4,0]] },
	'?': { width: 18, points: [[3,16],[3,17],[4,19],[5,20],[7,21],[11,21],[13,20],[14,19],[15,17],[15,15],[14,13],[13,12],[9,10],[9,7],[-1,-1],[9,2],[8,1],[9,0],[10,1],[9,2]] },
	'@': { width: 27, points: [[18,13],[17,15],[15,16],[12,16],[10,15],[9,14],[8,11],[8,8],[9,6],[11,5],[14,5],[16,6],[17,8],[-1,-1],[12,16],[10,14],[9,11],[9,8],[10,6],[11,5],[-1,-1],[18,16],[17,8],[17,6],[19,5],[21,5],[23,7],[24,10],[24,12],[23,15],[22,17],[20,19],[18,20],[15,21],[12,21],[9,20],[7,19],[5,17],[4,15],[3,12],[3,9],[4,6],[5,4],[7,2],[9,1],[12,0],[15,0],[18,1],[20,2],[21,3],[-1,-1],[19,16],[18,8],[18,6],[19,5]] },
	'A': { width: 18, points: [[9,21],[1,0],[-1,-1],[9,21],[17,0],[-1,-1],[4,7],[14,7]] },
	'B': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[-1,-1],[4,11],[13,11],[16,10],[17,9],[18,7],[18,4],[17,2],[16,1],[13,0],[4,0]] },
	'C': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5]] },
	'D': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[11,21],[14,20],[16,18],[17,16],[18,13],[18,8],[17,5],[16,3],[14,1],[11,0],[4,0]] },
	'E': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11],[-1,-1],[4,0],[17,0]] },
	'F': { width: 18, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11]] },
	'G': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[18,8],[-1,-1],[13,8],[18,8]] },
	'H': { width: 22, points: [[4,21],[4,0],[-1,-1],[18,21],[18,0],[-1,-1],[4,11],[18,11]] },
	'I': { width: 8, points: [[4,21],[4,0]] },
	'J': { width: 16, points: [[12,21],[12,5],[11,2],[10,1],[8,0],[6,0],[4,1],[3,2],[2,5],[2,7]] },
	'K': { width: 21, points: [[4,21],[4,0],[-1,-1],[18,21],[4,7],[-1,-1],[9,12],[18,0]] },
	'L': { width: 17, points: [[4,21],[4,0],[-1,-1],[4,0],[16,0]] },
	'M': { width: 24, points: [[4,21],[4,0],[-1,-1],[4,21],[12,0],[-1,-1],[20,21],[12,0],[-1,-1],[20,21],[20,0]] },
	'N': { width: 22, points: [[4,21],[4,0],[-1,-1],[4,21],[18,0],[-1,-1],[18,21],[18,0]] },
	'O': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21]] },
	'P': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,14],[17,12],[16,11],[13,10],[4,10]] },
	'Q': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21],[-1,-1],[12,4],[18,-2]] },
	'R': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[4,11],[-1,-1],[11,11],[18,0]] },
	'S': { width: 20, points: [[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
	'T': { width: 16, points: [[8,21],[8,0],[-1,-1],[1,21],[15,21]] },
	'U': { width: 22, points: [[4,21],[4,6],[5,3],[7,1],[10,0],[12,0],[15,1],[17,3],[18,6],[18,21]] },
	'V': { width: 18, points: [[1,21],[9,0],[-1,-1],[17,21],[9,0]] },
	'W': { width: 24, points: [[2,21],[7,0],[-1,-1],[12,21],[7,0],[-1,-1],[12,21],[17,0],[-1,-1],[22,21],[17,0]] },
	'X': { width: 20, points: [[3,21],[17,0],[-1,-1],[17,21],[3,0]] },
	'Y': { width: 18, points: [[1,21],[9,11],[9,0],[-1,-1],[17,21],[9,11]] },
	'Z': { width: 20, points: [[17,21],[3,0],[-1,-1],[3,21],[17,21],[-1,-1],[3,0],[17,0]] },
	'[': { width: 14, points: [[4,25],[4,-7],[-1,-1],[5,25],[5,-7],[-1,-1],[4,25],[11,25],[-1,-1],[4,-7],[11,-7]] },
	'\\': { width: 14, points: [[0,21],[14,-3]] },
	']': { width: 14, points: [[9,25],[9,-7],[-1,-1],[10,25],[10,-7],[-1,-1],[3,25],[10,25],[-1,-1],[3,-7],[10,-7]] },
	'^': { width: 16, points: [[6,15],[8,18],[10,15],[-1,-1],[3,12],[8,17],[13,12],[-1,-1],[8,17],[8,0]] },
	'_': { width: 16, points: [[0,-2],[16,-2]] },
	'`': { width: 10, points: [[6,21],[5,20],[4,18],[4,16],[5,15],[6,16],[5,17]] },
	'a': { width: 19, points: [[15,14],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
	'b': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
'c': { width: 18, points: [[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
	'd': { width: 19, points: [[15,21],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
	'e': { width: 18, points: [[3,8],[15,8],[15,10],[14,12],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
	'f': { width: 12, points: [[10,21],[8,21],[6,20],[5,17],[5,0],[-1,-1],[2,14],[9,14]] },
	'g': { width: 19, points: [[15,14],[15,-2],[14,-5],[13,-6],[11,-7],[8,-7],[6,-6],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
	'h': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
	'i': { width: 8, points: [[3,21],[4,20],[5,21],[4,22],[3,21],[-1,-1],[4,14],[4,0]] },
	'j': { width: 10, points: [[5,21],[6,20],[7,21],[6,22],[5,21],[-1,-1],[6,14],[6,-3],[5,-6],[3,-7],[1,-7]] },
	'k': { width: 17, points: [[4,21],[4,0],[-1,-1],[14,14],[4,4],[-1,-1],[8,8],[15,0]] },
	'l': { width: 8, points: [[4,21],[4,0]] },
	'm': { width: 30, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0],[-1,-1],[15,10],[18,13],[20,14],[23,14],[25,13],[26,10],[26,0]] },
	'n': { width: 19, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
	'o': { width: 19, points: [[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3],[16,6],[16,8],[15,11],[13,13],[11,14],[8,14]] },
	'p': { width: 19, points: [[4,14],[4,-7],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
	'q': { width: 19, points: [[15,14],[15,-7],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
	'r': { width: 13, points: [[4,14],[4,0],[-1,-1],[4,8],[5,11],[7,13],[9,14],[12,14]] },
	's': { width: 17, points: [[14,11],[13,13],[10,14],[7,14],[4,13],[3,11],[4,9],[6,8],[11,7],[13,6],[14,4],[14,3],[13,1],[10,0],[7,0],[4,1],[3,3]] },
	't': { width: 12, points: [[5,21],[5,4],[6,1],[8,0],[10,0],[-1,-1],[2,14],[9,14]] },
	'u': { width: 19, points: [[4,14],[4,4],[5,1],[7,0],[10,0],[12,1],[15,4],[-1,-1],[15,14],[15,0]] },
	'v': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0]] },
	'w': { width: 22, points: [[3,14],[7,0],[-1,-1],[11,14],[7,0],[-1,-1],[11,14],[15,0],[-1,-1],[19,14],[15,0]] },
	'x': { width: 17, points: [[3,14],[14,0],[-1,-1],[14,14],[3,0]] },
	'y': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0],[6,-4],[4,-6],[2,-7],[1,-7]] },
	'z': { width: 17, points: [[14,14],[3,0],[-1,-1],[3,14],[14,14],[-1,-1],[3,0],[14,0]] },
	'{': { width: 14, points: [[9,25],[7,24],[6,23],[5,21],[5,19],[6,17],[7,16],[8,14],[8,12],[6,10],[-1,-1],[7,24],[6,22],[6,20],[7,18],[8,17],[9,15],[9,13],[8,11],[4,9],[8,7],[9,5],[9,3],[8,1],[7,0],[6,-2],[6,-4],[7,-6],[-1,-1],[6,8],[8,6],[8,4],[7,2],[6,1],[5,-1],[5,-3],[6,-5],[7,-6],[9,-7]] },
	'|': { width: 8, points: [[4,25],[4,-7]] },
	'}': { width: 14, points: [[5,25],[7,24],[8,23],[9,21],[9,19],[8,17],[7,16],[6,14],[6,12],[8,10],[-1,-1],[7,24],[8,22],[8,20],[7,18],[6,17],[5,15],[5,13],[6,11],[10,9],[6,7],[5,5],[5,3],[6,1],[7,0],[8,-2],[8,-4],[7,-6],[-1,-1],[8,8],[6,6],[6,4],[7,2],[8,1],[9,-1],[9,-3],[8,-5],[7,-6],[5,-7]] },
	'~': { width: 24, points: [[3,6],[3,8],[4,11],[6,12],[8,12],[10,11],[14,8],[16,7],[18,7],[20,8],[21,10],[-1,-1],[3,8],[4,10],[6,11],[8,11],[10,10],[14,7],[16,6],[18,6],[20,7],[21,10],[21,12]] }
};

Summon.Text.lineCap = 'butt';

Summon.Text.letter = function(ch)
{
	return Summon.Text.letters[ch];
}

Summon.Text.ascent = function(font, size)
{
	return size;
}

Summon.Text.descent = function(font, size)
{
	return 7.0*size/25.0;
}

Summon.Text.measure = function(font, size, str)
{
	var total = 0;
	var len = str.length;

	for ( i = 0; i < len; i++) {
		var c = Summon.Text.letter( str.charAt(i));
		if ( c) total += c.width * size / 25.0;
	}
	return total;
}

Summon.Text.draw = function(ctx, font, size, x, y, str, transmat)
{
    var total = 0;
    var len = str.length;
    var mag = size / 25.0;
    if (!transmat)
	transmat = makeIdentityMatrix();

    ctx.save();
    ctx.lineCap = Summon.Text.lineCap;
	
    for (var i = 0; i < len; i++) {
	var c = Summon.Text.letter(str.charAt(i));
	if (!c) continue;

	ctx.beginPath();
        
	var penUp = 1;
	var needStroke = 0;
	for (var j = 0; j < c.points.length; j++) {
	    var a = c.points[j];
	    if (a[0] == -1 && a[1] == -1) {
		penUp = 1;
		continue;
	    }
            a = multVecMatrix(transmat, x + a[0]*mag, y - a[1]*mag);
	    if (penUp) {
		ctx.moveTo(a[0], a[1]);
		penUp = false;
	    } else {
		ctx.lineTo(a[0], a[1]);
	    }
	}
	ctx.stroke();
	x += c.width*mag;
    }
    ctx.restore();
    return total;
}

Summon.Text.enable = function( ctx)
{
    ctx.drawText = function(font,size,x,y,text,transmat) { return Summon.Text.draw( ctx, font,size,x,y,text,transmat); };
	ctx.measureText = function(font,size,text) { return Summon.Text.measure( font,size,text); };
	ctx.fontAscent = function(font,size) { return Summon.Text.ascent(font,size); }
	ctx.fontDescent = function(font,size) { return Summon.Text.descent(font,size); }

	ctx.drawTextRight = function(font,size,x,y,text) { 
		var w = Summon.Text.measure(font,size,text);
		return Summon.Text.draw( ctx, font,size,x-w,y,text); 
	};
	ctx.drawTextCenter = function(font,size,x,y,text) { 
		var w = Summon.Text.measure(font,size,text);
		return Summon.Text.draw( ctx, font,size,x-w/2,y,text); 
	};
}

