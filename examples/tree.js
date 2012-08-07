
function min(a, b) {
    return (a < b) ? a : b;
}
function max(a, b) {
    return (a > b) ? a : b;
}


function getTreeAges(tree) {
    var ages = {};

    function walk(name) {
        var node = tree.nodes[name];
        
        if (node.children.length == 0)
            ages[name] = 0.0;
        else {
            var cname = node.children[0];
            var child = tree.nodes[cname];
            walk(cname);
            ages[name] = ages[cname] + child.dist;
        }
    }
    walk(tree.root);
    
    return ages;
}


function layoutTree(tree, options)
{
    // setup options
    if (typeof options == "undefined")
        options = {};
    if (typeof options.x == "undefined")
        options.x = 0;
    if (typeof options.y == "undefined")
        options.y = 0;
    if (typeof options.yscale == "undefined")
            options.yscale = 1.0;
    var minlen = 0;
    var maxlen = 1e12;
        
    var sizes = {};
    var nodept = {}; // distance between node x and left bracket x
    var layout = {};

        
    function walk(name) {    
        var node = tree.nodes[name];
        
        // compute node sizes
        sizes[name] = 0;
        for (var i in node.children) {
            var cname = node.children[i];
            sizes[name] += walk(cname);
        }
        
        if (node.children == 0) {
            sizes[name] = 1;
            nodept[name] = 1;
        } else {
            var n = node.children.length;
            var top = nodept[node.children[0]];
            var bot = (sizes[name] - sizes[node.children[n-1]]) + 
                nodept[node.children[n-1]];
            nodept[name] = (top + bot) / 2.0;
        }
        
        return sizes[name];
    }
    walk(tree.root);
        
    // determine x, y coordinates
    function walk2(name, x, y) {
        var node = tree.nodes[name];
        var ychildren = y + min(max(node.dist, minlen), maxlen) * 
            options.yscale;
        layout[name] = [x + nodept[name], ychildren];
        
        if (!node.children.length == 0) {
            var xchild = x;
            for (var i in node.children) {
                var cname = node.children[i];
                walk2(cname, xchild, ychildren);
                xchild += sizes[cname];
            }
        }
    }
    walk2(tree.root, options.x, options.y);
    
    return layout;
}

