// CDN Link : https://sdk.amazonaws.com/js/aws-sdk-2.1402.0.min.js
self.onInit = function () {
  //
  // Data constructs and initialization.
  //

  // **DO THIS**:
  //   Replace BUCKET_NAME with the bucket name.
  //
  var albumBucketName = 'thingplus.alarad';

  // **DO THIS**:
  //   Replace this block of code with the sample code located at:
  //   Cognito -- Manage Identity Pools -- [identity_pool_name] -- Sample Code -- JavaScript
  //
  // Initialize the Amazon Cognito credentials provider
  AWS.config.region = 'ap-northeast-2'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ap-northeast-2:77fc3659-1e55-479f-8f9c-3f55cf2516ee',
  });

  // Create a new service object
  var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
      Bucket: albumBucketName,
    },
  });

  // listAlbums();
  viewAlbum('');

  // A utility function to create HTML.
  function getHtml(template) {
    return template.join('\n');
  }

  //
  // Functions
  //

  // List the photo albums that exist in the bucket.
  function listAlbums() {
    s3.listObjects(
      {
        Delimiter: '/',
      },
      function (err, data) {
        console.log('data', data);
        if (err) {
          return alert('There was an error listing your albums: ' + err.message);
        } else {
          var albums = data.CommonPrefixes.map(function (commonPrefix) {
            var prefix = commonPrefix.Prefix;
            var albumName = decodeURIComponent(prefix.replace('/', ''));

            console.log('albumName', albumName);

            return getHtml([
              '<li>',
              '<button style="margin:5px;" onclick="viewAlbum(\'' + albumName + '\')">',
              albumName,
              '</button>',
              '</li>',
            ]);
          });

          var message = albums.length
            ? getHtml(['<p>Click on an album name to view it.</p>'])
            : '<p>You do not have any albums. Please Create album.';
          var htmlTemplate = ['<h2>Albums</h2>', message, '<ul>', getHtml(albums), '</ul>'];
          document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
        }
      }
    );
  }

  // Show the photos that exist in an album.
  function viewAlbum(albumName) {
    // var albumPhotosKey = encodeURIComponent(albumName) + '/';
    // var albumPhotosKey = encodeURIComponent(albumName);
    s3.listObjects(
      {
        Prefix: albumName,
      },
      // {
      //   Delimiter: '/',
      // },
      function (err, data) {
        if (err) {
          return alert('There was an error viewing your album: ' + err.message);
        }

        console.log('data', data);
        // 'this' references the AWS.Request instance that represents the response
        var href = this.request.httpRequest.endpoint.href;
        var bucketUrl = href + albumBucketName + '/';

        console.log(href, bucketUrl);

        var photos = data.Contents.filter(content => content.Key.includes('jpg')).map(function (photo) {
          var photoKey = photo.Key;
          var photoUrl = bucketUrl + encodeURIComponent(photoKey);

          console.log('photoUrl', photoUrl);

          return getHtml([
            '<span>',
            '<div>',
            '<br/>',
            '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
            '</div>',
            '<div>',
            '<span>',
            photoKey,
            '</span>',
            '</div>',
            '</span>',
          ]);
        });
        // var message = photos.length
        //   ? '<p>The following photos are present.</p>'
        //   : '<p>There are no photos in this album.</p>';
        // var htmlTemplate = [
        //   '<div>',
        //   '<button onclick="listAlbums()">',
        //   'Back To Albums',
        //   '</button>',
        //   '</div>',
        //   '<h2>',
        //   'Album: ' + albumName,
        //   '</h2>',
        //   message,
        //   '<div>',
        //   getHtml(photos),
        //   '</div>',
        //   '<h2>',
        //   'End of Album: ' + albumName,
        //   '</h2>',
        //   '<div>',
        //   '<button onclick="listAlbums()">',
        //   'Back To Albums',
        //   '</button>',
        //   '</div>',
        // ];
        document.getElementById('viewer').innerHTML = getHtml(photos);
        // document.getElementsByTagName('img')[0].setAttribute('style', 'display:none;');
      }
    );
  }
};
