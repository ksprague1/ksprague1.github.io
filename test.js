console.log('hello world');
console.log(Math.random());


//first up is probably the rejection free algorithm so I don't have to do any array copying 

//stole this recursive thing but gonna make not recursive
function zeros(dimensions) {
    var array = [];
    for (var i = 0; i < dimensions[0]; i++) {
        var arr2= [];
        for (var j=0; j<dimensions[0];j++){
            arr2.push(0);
        }
        array.push(arr2);
    }

    return array;
}

function random_ones(dim,arr,N){
 for(var i=0;i<N;){ 
    x=Math.floor(Math.random() * dim[0]);
    y=Math.floor(Math.random() * dim[1]);
    if (grid[x][y]==0){
        grid[x][y]=1
        i++;
    }
 }
}

function sum(arr){
 sx=arr.length;
 sy=arr[0].length;
 s=0
 for (var i=0;i<sx;i++){
     for(var j=0;j<sy;j++){
      s+=arr[i][j]   
     }
 }
 return s
}


function clustering(x,y,grid,xarr,yarr,p,sx,sy){
    //it's important to set the grid area to 0 initially so
    //there is no infinite recursion
    grid[x][y]=0
    xarr.push(x);
    yarr.push(y);
    //check to move the cluster in each direction
    if (grid[(x+1)%sx][y]==1 && Math.random()<=p){
        clustering((x+1)%sx,y,grid,xarr,yarr,p,sx,sy);}
    if (grid[(x-1+sx)%sx][y]==1 && Math.random()<=p){
        clustering((x-1+sx)%sx,y,grid,xarr,yarr,p,sx,sy);}
    if (grid[x][(y+1)%sy]==1 && Math.random()<=p){
        clustering(x,(y+1)%sy,grid,xarr,yarr,p,sx,sy);}
    if (grid[x][(y-1+sy)%sy]==1 && Math.random()<=p){
        clustering(x,(y-1+sy)%sy,grid,xarr,yarr,p,sx,sy);}
}

function make_cluster(x,y,grid,d,p){
    xarr=[];
    yarr=[];
    if (grid[x][y]==1){
        clustering(x,y,grid,xarr,yarr,p,grid.length,grid[0].length)
    }
    for (var i=0;i<xarr.length;i++){
        grid[xarr[i]][yarr[i]]=1;
    }
    return [xarr,yarr];
}

function addmod(arr,val,size,pos){
    arr2=[];
    for (var i=0;i<arr.length;i++){
    //please no negative numbers thx
    arr2.push(pos ? (arr[i]+val+size)%size :  (-arr[i]+val+size)%size);
    }
    return arr2
}


function Update(grid,JB){
    //The equation is: p = max(0,1 − exp[BEc(i,j)−BEI(i,j)])
    //here Ec = -J and EI=0
    //Note this is a ficticious hamiltonian since it considers an overlap
    //to have zero energy whereas in the real one an overlap has infinite
    p=1-Math.exp(-JB)
    p= p < 0 ? 0: p> 0.9999999999999999 ? 0.9999999999999999 :  p
    //Now we upper bound p to the largest floating point less than 1
    //This number is 0.9999999999999999
    
    sx=grid.length;
    sy=grid[0].length;
    
    var pos = [];
    for (var i=0;i<sx;i++){
        for (var j=0;j<sy;j++){
            if (grid[i][j]==1){
                pos.push([i,j]);
            }
        }
    }
    
    i=Math.floor(Math.random() * pos.length);
    x=pos[i][0];
    y=pos[i][1];
    action=Math.floor(Math.random() * 6);
    
    returns=make_cluster(x,y,grid,action,p);
    xs=returns[0];
    ys=returns[1];
    
    for (var i=0;i<xs.length;i++){
        grid[xs[i]][ys[i]]=0;
    }
    
    //cluster translation
    switch (action){
    case 0:
        rx=addmod(xs,1,sx,true);
        ry=ys;
        break;
    case 1:
        rx=addmod(xs,-1,sx,true);
        ry=ys;
        break;
    case 2:
        rx=xs;
        ry=addmod(ys,1,sy,true);
        break;
    case 3:
        rx=xs;
        ry=addmod(ys,-1,sy,true);
        break;
    case 4:
        //apply rotation to coordinates
        rx=addmod(ys,y+x,sx,false);
        ry=addmod(xs,y-x,sy,true);
        break;
        //rx=(-(ys-y)+x)%sx
        //ry=((xs-x)+y)%sy
    case 5:
        rx=addmod(ys,x-y,sx,true);
        ry=addmod(xs,x+y,sy,false);
        break;
        //rx=((ys-y)+x)%sx
        //ry=(-(xs-x)+y)%sy       
    }
    s=0
    for (var i=0; i<rx.length;i++){
        s+=grid[rx[i]][ry[i]];
    }
    
    if (s!=0){
        for (var i=0; i<xs.length;i++){
            grid[xs[i]][ys[i]]=1
        }
        //console.log('sad');
    }
    else{
    for (var i=0;i<rx.length;i++){
        grid[rx[i]][ry[i]]=1;
        }   
    }
    //console.log(x,y)
    //console.log(xs,ys);
    //console.log(rx,ry);
}

function setpixels(ctx,grid){
    var h = ctx.canvas.height;
    var w = ctx.canvas.width;
    //console.log(h/grid.length)
    scale=h/grid.length
    var imgData = ctx.getImageData(0, 0, w, h);
    var data = imgData.data;  // the array of RGBA values
    //console.log(data.length)
    for(var s = 0; s < data.length; s+=4) {
        x=Math.floor(s/4/w/scale);
        y=Math.floor(((s/4)%w)/scale)
        //s = 4 * x * w + 4 * y    probably
        data[s] = grid[x][y]*255;
        data[s + 1] = 0;//grid[x][y]*255;
        data[s + 2] = grid[x][y]*255;
        data[s + 3] = 255;  // fully opaque
    }
    ctx.putImageData(imgData, 0, 0);
}

var KTslider = document.getElementById("kT");
var kT = 1.0
var stepslider = document.getElementById("steps");
var stepsperframe=100;

stepslider.oninput = function() {
  stepsperframe=10*this.value;
}
KTslider.oninput = function() {
  kT = 2*Math.exp(this.value/25);
}


function run(){
 for (var i=0;i<stepsperframe;i++){
 Update(grid,1/kT);
 }
 //console.log(sum(grid))
 setpixels(ctx,grid);
 window.requestAnimationFrame(run);
}

INDX=0
grid = zeros([128,128]);
random_ones([128,128],grid,2000)
//grid[0][0]=1;
console.log(grid);
console.log((-1+10)%5)
xy=make_cluster(0,0,grid,0,0.8)
console.log(xy);
console.log(grid);

var canvas = document.getElementById('grid');
console.log(canvas);
ctx = canvas.getContext("2d");

setpixels(ctx,grid)

window.requestAnimationFrame(run)
