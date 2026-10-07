# Atlas preparation: retain source pixels/alpha, derive player shirt colors and portraits.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;
using System.Text;
public static class CyborgAtlas {
 public static void Build(string root) {
  using(var source=new Bitmap(Path.Combine(root,"public/cyborg-master.png"))) {
   var bitmap=new Bitmap(source.Width,source.Height,PixelFormat.Format32bppArgb);
   using(var g=Graphics.FromImage(bitmap))g.DrawImageUnscaled(source,0,0);
   var data=bitmap.LockBits(new Rectangle(0,0,bitmap.Width,bitmap.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   int stride=data.Stride; byte[] pixels=new byte[stride*bitmap.Height];Marshal.Copy(data.Scan0,pixels,0,pixels.Length);bitmap.UnlockBits(data);
   var bounds=new Rectangle[16];int maxHeight=0;
   for(int row=0;row<4;row++)for(int col=0;col<4;col++) {
    int x0=(int)Math.Round(col*bitmap.Width/4.0),x1=(int)Math.Round((col+1)*bitmap.Width/4.0);
    int y0=(int)Math.Round(row*bitmap.Height/4.0),y1=(int)Math.Round((row+1)*bitmap.Height/4.0);
    int left=x1,top=y1,right=x0,bottom=y0;
    for(int y=y0;y<y1;y++)for(int x=x0;x<x1;x++)if(pixels[y*stride+x*4+3]>48){left=Math.Min(left,x);right=Math.Max(right,x);top=Math.Min(top,y);bottom=Math.Max(bottom,y);}
    if(right<=left||bottom<=top)throw new Exception("Empty sprite cell");
    bounds[row*4+col]=Rectangle.FromLTRB(Math.Max(x0,left-1),Math.Max(y0,top-1),Math.Min(x1,right+2),Math.Min(y1,bottom+2));
    if(row<3)maxHeight=Math.Max(maxHeight,bottom-top+1);
   }
   string[] colors={"637f83","6950ad","216eaa","b54768","b48d37","268d83","8d51b4","5f9238"};
   for(int slot=0;slot<8;slot++) {
    byte[] variant=(byte[])pixels.Clone();var target=ColorTranslator.FromHtml("#"+colors[slot]);
    if(slot>0)foreach(var box in bounds) {
     int y0=box.Top+(int)(box.Height*.33),y1=box.Top+(int)(box.Height*.70);
     for(int y=y0;y<y1;y++)for(int x=box.Left;x<box.Right;x++) {
      int k=y*stride+x*4;double b=variant[k],g=variant[k+1],r=variant[k+2];
      if(variant[k+3]>0 && g>r*1.08 && b>r*1.04 && Math.Abs(g-b)<30 && g<200) {
       double light=(r+g+b)/330.0;
       variant[k]=(byte)Math.Min(255,target.B*light);variant[k+1]=(byte)Math.Min(255,target.G*light);variant[k+2]=(byte)Math.Min(255,target.R*light);
      }
     }
    }
    using(var output=new Bitmap(bitmap.Width,bitmap.Height,PixelFormat.Format32bppArgb)) {
     var bits=output.LockBits(new Rectangle(0,0,output.Width,output.Height),ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);
     Marshal.Copy(variant,0,bits.Scan0,variant.Length);output.UnlockBits(bits);
     output.Save(Path.Combine(root,"public/cyborg-"+(slot+1)+".png"),ImageFormat.Png);
     using(var avatar=new Bitmap(256,256))using(var g=Graphics.FromImage(avatar)) {
      g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode=System.Drawing.Drawing2D.PixelOffsetMode.Half;
      var box=bounds[0];float scale=224f/box.Height;
      g.DrawImage(output,new RectangleF(128-box.Width*scale/2,16,box.Width*scale,224),box,GraphicsUnit.Pixel);
      avatar.Save(Path.Combine(root,"public/player-avatar-"+(slot+1)+".png"),ImageFormat.Png);
     }
    }
   }
   var json=new StringBuilder("// Derived from cyborg-master.png by scripts/prepare-cyborgs.ps1.\nexport const ATLAS = { width: "+bitmap.Width+", height: "+bitmap.Height+", bodyHeight: "+maxHeight+", frames: [\n");
   foreach(var r in bounds)json.Append("  ["+r.X+","+r.Y+","+r.Width+","+r.Height+"],\n");
   json.Append("] };\n");File.WriteAllText(Path.Combine(root,"client/cyborg-atlas-data.js"),json.ToString());bitmap.Dispose();
  }
 }
}
"@
[CyborgAtlas]::Build($project)
