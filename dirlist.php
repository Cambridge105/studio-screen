<?php
header('Content-Type: application/javascript');

/* *****************************
  This file needs to live in the 
  GREENROOM SCREEN directory on 
  the Scratch drive. It's only
  committed here for safe keeping!
  ****************************** */

$dirlist = getFileList(".");
echo "var tempslides = new Array(); ";
foreach($dirlist as $file) {
    if($file['type'] != 'image/jpeg') continue;
    echo "tempslides.push(\"",basename($file['name']),"\"); ";
  }
  
  
  function getFileList($dir)
  {
    // array to hold return value
    $retval = array();

    // add trailing slash if missing
    if(substr($dir, -1) != "/") $dir .= "/";

    // open pointer to directory and read list of files
    $d = @dir($dir) or die("getFileList: Failed opening directory $dir for reading");
    while(false !== ($entry = $d->read())) {
      // skip hidden files
      if($entry[0] == ".") continue;
      if(is_dir("$dir$entry")) {
        $retval[] = array(
          "name" => "$dir$entry/",
          "type" => filetype("$dir$entry"),
          "size" => 0,
          "lastmod" => filemtime("$dir$entry")
        );
      } elseif(is_readable("$dir$entry")) {
        $retval[] = array(
          "name" => "$dir$entry",
          "type" => mime_content_type("$dir$entry"),
          "size" => filesize("$dir$entry"),
          "lastmod" => filemtime("$dir$entry")
        );
      }
    }
    $d->close();

    return $retval;
  }
  
?>