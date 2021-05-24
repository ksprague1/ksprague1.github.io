const gpu = new GPU();
console.log(Math.log(2))
//stole this recursive thing but gonna make not recursive
function zeros(dimensions) {
    var array = [];
    for (var i = 0; i < dimensions[0]; i++) {
        var arr2= [];
        for (var j=0; j<dimensions[1];j++){
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

const random_arr = gpu.createKernel(function(offset){
return 1-(Math.random()+offset)%1                                   
}).setOutput([1000, 1000])



const bins = gpu.createKernel(function(grid,L){
let x = this.thread.x
let bin = x/1000
let s=0;
for(let i=0;i<L;i++){
for(let j=0;j<L;j++){
if (grid[i][j]<=bin){
s+=1;
}
}
}
return s/L/L*100;
},{
  output: [1001],
});
                            
bin = bins(random_arr(0.8448023168226166),1000)
console.log(U(bin))


function U(arr){
let s=0
for (let j=0;j<50;j++){
s+=Math.abs(arr[j]-j/10)
}
return s;
}

function mcmc_best_seed(steps,B){
    off=0.8489598556898322
    bin = bins(random_arr(off),1000)
    E=U(bin)+U(bins(random_arr(off),1000))
    console.log("start: ",E)
    bestU=E
    best=off
    
    for (i=0;i<steps;i++){
        if ((i+1)%Math.floor(steps/50)==0){
        console.log(i/steps*100,E)
        }
        
        off_prop=(off+(Math.random()-0.5)/500)%1    
        bin = bins(random_arr(off_prop),1000)
        E2=U(bin)+U(bins(random_arr(off_prop),1000))
        if(Math.random()<Math.exp(-B*(E2-E) ) ){
            E=E2
            off=off_prop
        }
        if(E2<bestU){
        bestU=E2
        best=off_prop
        console.log(bestU);
        }
    }
    return [E,off,bestU,best];
}
console.log("Finding best one?")
console.log(U(bins(random_arr(0),1000) ) )
console.log(mcmc_best_seed(0,0.05))
total=[]
for (let j=0;j<1001;j++){
total.push(0);
}
    
for(let i=0;i<100000;i++){
n=Math.random()
for (let j=0;j<1001;j++){
if (n<=j/1000){
total[j]+=1
}
}
}
for (let j=0;j<1001;j++){
total[j]=total[j]/1000
}
console.log(total)
console.log(U(total))

let height=64;
let width=64;


function Proposal(grid,kT,Jd,Ju,u,parity,h,w,NumSpecies,PREFILLED) {
    let i=this.thread.y
    let j=this.thread.x
    let s=grid[i][j];
    let Q=NumSpecies-w*PREFILLED
    //This updates grid cells at least a little bit stochastically, the choice of 0.7 is arbitrary
    if ((i+j)%2==parity && Math.random()<0.7 && i >= PREFILLED){
        //MCMC Update
        let val = grid[i][j]==0? w*PREFILLED+1+Math.floor(Math.random() * Q):grid[i][j];
        let delta=0;
        let A=0.0;
        let good=0;
        let bad=0;
        let goodval = 0;
        let particle=-1;
        //get ready for a ton of if statements because this will be done by each case
        //value format is i*w+j+1
        //w=sy
        //no periodic boundaries for vertical direction which is actually x
        if(i>0 && grid[i-1][j]!=0){
            //given i*w+j+1 find (i-1)*w+j+1 ===  i*w+j+1 - w
            goodval=val-w
            if (goodval==grid[i-1][j]){
                good++;
            }
            else{bad++;}
        }
        if(i<h-1 && grid[i+1][j]!=0){
            //given i*w+j+1 find (i-1)*w+j+1 ===  i*w+j+1 - w
            goodval=val+w
            if (goodval==grid[i+1][j]){
                good++;
            }
            else{bad++;}
        }
        let jplus=j+1<w?j+1:0
        let jminus=j-1>=0?j-1:w-1
        let jp1=0;
        if(grid[i][jminus]!=0){
            //given i*w+j+1 find i*w+(j-1)%sy+1
            jp1=val%w;
            goodval=val-1;
            if (jp1==1){goodval+=w}
            if (goodval==grid[i][jminus]){
                good++;
            }
            else{bad++;}
        }
        if(grid[i][jplus]!=0){
            //given i*w+j+1 find i*w+(j+1)%sy+1
            jp1=val%w;
            goodval=val+1;
            if (jp1==0){goodval-=w}
            if (goodval==grid[i][jplus]){
                good++;
            }
            else{bad++;}
        }
        if (grid[i][j]==0){
        particle=val;
        delta=u-Jd*good-Ju*bad
        A=Q;
        }
        else{
        delta=-u+Jd*good+Ju*bad
        A=1/Q;
        particle = 0;
        }
        //math.random sucks in this gpu library
        let n = 1-(Math.random()+0.8489598556898322)%1  
        if (n<A*Math.exp(-delta/kT)){
            s=particle;
        }
    }

    return s;
}

let gpuprop = gpu.createKernel(
    Proposal
    , {
        output: [width, height],
        pipeline: true,
        immutable: true
    });

class Dummy{
constructor() {
    this.thread=this;
    this.prop=Proposal;
  }
}
let dummy = new Dummy()

function cpuprop(grid,kT,Jd,Ju,u,parity,h,w,NumSpecies,PREFILLED) {
    for(var i=0;i<h;i++){for(var j=0;j<w;j++){
    dummy.y=i;
    dummy.x=j;
    s = dummy.prop(grid,kT,Jd,Ju,u,parity,h,w,NumSpecies,PREFILLED)
    grid[i][j] = s;
    }}
    return grid;
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
        if (grid[x][y]>0){
        s2=(grid[x][y]-1)*4;
        data[s] = RGBData[s2];
        data[s + 1] = RGBData[s2+1];
        data[s + 2] = RGBData[s2+2];
        data[s + 3] = RGBData[s2+3];  // fully opaque
        }
        else{
        data[s] = 0
        data[s + 1] = 0
        data[s + 2] = 0
        data[s + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

const $ = q => document.getElementById(q);
const GRAND_CANONICAL_PROB=0.4
const PREFILLED=1;
const MAXDIMX=64;
var kT = 1.0
var mew = 0.0;
var toggle=false;
var kval1=100;
var kval2=100;
var N = 0;
var stepsperframe=100;
var startTime = 0;
var on = false;
$("steps").oninput = function() {
  stepsperframe=Math.pow(4,this.value)*2;
  if (this.value>=0){
  $('stepstext').innerHTML = Math.pow(4,this.value);
  }
  else{
  $('stepstext').innerHTML = "1/"+Math.pow(4,-this.value);
  }
}
$('stopbutton').addEventListener("click", function(){
    on = !on;
    $('stoptext').innerHTML=on? 'Stop':'Start';
    if (on){
        window.requestAnimationFrame(run);
    }
})

$("mew").oninput = function() {
  mew = this.value/5.0;
  $('mewtext').innerHTML = mew.toFixed(3);
}
    

$("kT").oninput = function() {
  kT = Math.exp(this.value/20);
  $('kTtext').innerHTML = kT.toFixed(3);
  //console.log(kT);
}

var coll = document.getElementsByClassName("Default Images");
var i;
function test(){
    this.target=this;
    this.result=this.src;
    setimg(this);
}
for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click",test)
}


function setimg(event) {
    //img = $("imcontainer");
    var img = new Image();
    img.src = event.target.result;
    img.onload = function(){
        w=Math.ceil(img.width/2)*2;
        h=Math.ceil(img.height/2)*2;
        if (w>MAXDIMX){   
            h = Math.floor(h*MAXDIMX/w/2)*2;
            w=MAXDIMX;
        }
        height=h;
        width=w;
        update_kernels();
        scale=Math.floor(512/w);
        canvas.width=w*scale;
        canvas.height=h*scale;
        ctx.drawImage(img, 0, 0,w,h);
        grid = zeros([h,w]);
        var imgData = ctx.getImageData(0, 0, w, h);
        RGBData = imgData.data; 
        NumSpecies=h*w;
        console.log("sx:"+grid.length +" sy:"+grid[0].length)
        //fill in some starting positions
        //by setting bounds for i and j you specify the particles already in the right place
        for (var i=0;i<PREFILLED;i++){
            for (var j=0;j<w;j++){
                grid[i][j]=i*w+j+1;
            }
        }
        setpixels(ctx,grid)
    }

}
document.onpaste = function(pasteEvent) {
    // consider the first item (can be easily extended for multiple items)
    var item = pasteEvent.clipboardData.items[0];
    if (item.type.indexOf("image") === 0)
    {
        var blob = item.getAsFile();
 
        var reader = new FileReader();
        reader.onload = setimg;
 
        reader.readAsDataURL(blob);
    }
}

const J=2
let getval = gpu.createKernel(function(a) {
return a[this.thread.y][this.thread.x];
}).setOutput([width, height])

function update_kernels(){
    getval.destroy();
    gpuprop.destroy();
    getval = gpu.createKernel(function(a) {
        return a[this.thread.y][this.thread.x];
    }).setOutput([width, height])
    prop = gpuprop = gpu.createKernel(
        Proposal
        , {
            output: [width, height],
            pipeline: true,
            immutable: true
        });
    prop = gpuprop;
}

let prop=gpuprop;
function run(){
    n = Math.random()<=0.5?0:1
    grid2 = prop(grid,kT,J,0,mew,n,height,width,NumSpecies,PREFILLED)
    n = Math.random()<=0.5?0:1
    grid = prop(grid2,kT,J,0,mew,1-n,height,width,NumSpecies,PREFILLED)
    grid2.delete()
    for (var i=0;i<stepsperframe-1;i++){
        n = Math.random()<=0.5?0:1
        grid2 = prop(grid,kT,J,0,mew,n,height,width,NumSpecies,PREFILLED)
        grid.delete()
        n = Math.random()<=0.5?0:1
        grid = prop(grid2,kT,J,0,mew,1-n,height,width,NumSpecies,PREFILLED)
        grid2.delete()
    }
    n = Math.random()<=0.5?0:1
    grid2 = prop(grid,kT,J,0,mew,n,height,width,NumSpecies,PREFILLED)
    grid.delete()
    grid = getval(grid2);
    grid2.delete()
    //if (Math.random()<0.01){console.log(sum(grid))}
    setpixels(ctx,grid);
    var newtime=(new Date()).getTime()
    var elapsedTime = (newtime - startTime) / 1000;// time in seconds
    startTime=newtime
    $('stepmeter').innerHTML = Number(stepsperframe/elapsedTime).toFixed(0);
    if (on){
     window.requestAnimationFrame(run);
    }
}

INDX=0
grid = zeros([height,width]);
stepsperframe=Math.pow(4,-1)*2;
$('stepstext').innerHTML = "1/"+Math.pow(4,1);
var RGBData;
var NumSpecies=0;
//random_ones([128,128],grid,2000)

var canvas = document.getElementById('grid');
console.log(canvas);
ctx = canvas.getContext("2d");

setpixels(ctx,grid)

window.requestAnimationFrame(run)
