let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));

openAddEntityDialog();

function openAddEntityDialog() {
  customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();
}

function AddEntityDialogController(instance) {
  let vm = instance;

  let bed = additionalParams.bed;
  let position = additionalParams.position;

  vm.customerList = [
    { name: 'Bed1', key: 'B1' },
    { name: 'Bed2', key: 'B2' },
    { name: 'Bed3', key: 'B3' },
    { name: 'Bed4', key: 'B4' },
  ];
  vm.deviceList = [
    { name: 'P-1', key: 'P1' },
    { name: 'P-2', key: 'P2' },
    { name: 'P-3', key: 'P3' },
    { name: 'P-4', key: 'P4' },
    { name: 'P-5', key: 'P5' },
    { name: 'P-6', key: 'P6' },
    { name: 'P-7', key: 'P7' },
    { name: 'P-8', key: 'P8' },
    { name: 'P-9', key: 'P9' },
    { name: 'P-10', key: 'P10' },
    { name: 'P-11', key: 'P11' },
    { name: 'P-12', key: 'P12' },
    { name: 'P-13', key: 'P13' },
    { name: 'P-14', key: 'P14' },
    { name: 'P-15', key: 'P15' },
    { name: 'P-16', key: 'P16' },
    { name: 'P-17', key: 'P17' },
    { name: 'P-18', key: 'P18' },
    { name: 'P-19', key: 'P19' },
    { name: 'P-20', key: 'P20' },
    { name: 'P-21', key: 'P21' },
    { name: 'P-22', key: 'P22' },
    { name: 'P-23', key: 'P23' },
    { name: 'P-24', key: 'P24' },
    { name: 'P-25', key: 'P25' },
    { name: 'P-26', key: 'P26' },
    { name: 'P-27', key: 'P27' },
    { name: 'P-28', key: 'P28' },
    { name: 'P-29', key: 'P29' },
    { name: 'P-30', key: 'P30' },
  ];

  vm.addEntityFormGroup = vm.fb.group({
    selectedCustomer: [bed],
    selectedDevice: [position],
  });

  insertData(bed, position);

  var albumBucketName = 'thingplus.clust';

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

  let albumName = bed + '/' + position + '/';

  viewAlbum(albumName);

  // changeDeviceList();

  vm.changeDevice = function ($event) {
    let selectedCustomer = vm.addEntityFormGroup.get('selectedCustomer').value;
    let selectedDevice = vm.addEntityFormGroup.get('selectedDevice').value;

    viewAlbum(selectedCustomer + '/' + selectedDevice + '/');
    insertData(selectedCustomer, selectedDevice);
  };

  vm.photoPrev = function () {
    if (vm.photoIdx == 0) return;

    vm.photoSelect(vm.photoIdx - 1);
  };

  vm.photoNext = function () {
    if (vm.photoIdx == 3) return;

    vm.photoSelect(vm.photoIdx + 1);
  };

  vm.photoSelect = function (idx) {
    vm.originPhotoList;

    let photoURL = vm.bucketUrl + encodeURIComponent(vm.originPhotoList[idx].key);
    let photoKey = vm.originPhotoList[idx].name;

    let photoDateList = photoKey.split('_');
    let ymd = photoDateList[0];
    let hms = photoDateList[1];

    let photoDate =
      '20' +
      ymd.substring(0, 2) +
      '년 ' +
      ymd.substring(2, 4) +
      '월 ' +
      ymd.substring(4) +
      '일 ' +
      hms.substring(0, 2) +
      ':' +
      hms.substring(2, 4) +
      ':' +
      hms.substring(4);

    vm.photoDate = photoDate;
    vm.photoURL = photoURL;

    vm['active3'] = '';
    vm['active2'] = '';
    vm['active1'] = '';
    vm['active0'] = '';

    vm['active' + idx] = 'active';
    vm.photoIdx = idx;
  };

  vm.downloadAll = async function () {
    for (let i in vm.originPhotoList) {
      const url = s3.getSignedUrl('getObject', {
        Key: vm.originPhotoList[i].key,
        Expires: 60 * 2, // 몇초동안 유효한지 명시
      });

      const response = await fetch(url);
      const blobImage = await response.blob();
      const href = URL.createObjectURL(blobImage);
      const anchorElement = document.createElement('a');
      anchorElement.href = href;
      anchorElement.download = vm.originPhotoList[i].name;
      document.body.appendChild(anchorElement);
      anchorElement.click();
      document.body.removeChild(anchorElement);
      window.URL.revokeObjectURL(href);
    }
  };

  vm.download = async function () {
    const url = s3.getSignedUrl('getObject', {
      Key: vm.originPhotoKey,
      Expires: 60 * 2, // 몇초동안 유효한지 명시
    });

    const response = await fetch(url);
    const blobImage = await response.blob();
    const href = URL.createObjectURL(blobImage);
    const anchorElement = document.createElement('a');
    anchorElement.href = href;
    anchorElement.download = vm.photoKey;
    document.body.appendChild(anchorElement);
    anchorElement.click();
    document.body.removeChild(anchorElement);
    window.URL.revokeObjectURL(href);
  };

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  function insertData(bed, position) {
    let custom = widgetContext.custom;

    let fruitSum = 0;
    for (let key in custom.fruitDataObj.sum) {
      fruitSum += custom.fruitDataObj.sum[key];
    }

    let targetPosition = custom.positionObj[bed][position.slice(1)];

    vm.fruitSum = 0;
    for (let i in targetPosition) {
      vm.fruitSum += targetPosition[i];
    }

    vm.level0Sum = targetPosition[0];
    vm.level1Sum = targetPosition[1];
    vm.level2Sum = targetPosition[2];
    vm.level3Sum = targetPosition[3];
    vm.level4Sum = targetPosition[4];
    vm.level5Sum = targetPosition[5];
    vm.level6Sum = targetPosition[6];
  }

  // Show the photos that exist in an album.
  function viewAlbum(albumName) {
    // var albumPhotosKey = encodeURIComponent(albumName) + '/';
    // var albumPhotosKey = encodeURIComponent(albumName);

    s3.listObjects(
      {
        Prefix: albumName,
      },
      function (err, data) {
        if (err) {
          return alert('There was an error viewing your album: ' + err.message);
        }

        // 'this' references the AWS.Request instance that represents the response
        let href = this.request.httpRequest.endpoint.href;
        let bucketUrl = href + albumBucketName + '/';
        vm.bucketUrl = bucketUrl;

        let photoURL;
        let photoDate;
        let photoKey;
        vm.originPhotoKey;
        vm.originPhotoList = [];
        let photos = data.Contents.filter(content => content.Key.includes('png')).map(function (photo, idx) {
          let obj = {};

          photoKey = photo.Key;
          vm.originPhotoKey = photo.Key;
          photoURL = bucketUrl + encodeURIComponent(photoKey);

          photoKey = photoKey.replace(albumName, '');
          vm['photoName' + idx] = photoKey;

          let photoDateList = photoKey.split('_');
          let ymd = photoDateList[0];
          let hms = photoDateList[1];

          photoDate =
            '20' +
            ymd.substring(0, 2) +
            '년 ' +
            ymd.substring(2, 4) +
            '월 ' +
            ymd.substring(4) +
            '일 ' +
            hms.substring(0, 2) +
            ':' +
            hms.substring(2, 4) +
            ':' +
            hms.substring(4);

          obj.key = photo.Key;
          obj.name = photoKey;

          vm.originPhotoList.push(obj);

          vm['active3'] = '';
          vm['active2'] = '';
          vm['active1'] = '';
          vm['active0'] = '';

          vm['active' + idx] = 'active';
          vm.photoIdx = idx;
        });

        vm.photoKey = photoKey;
        vm.photoDate = photoDate;
        vm.photoURL = photoURL;
      }
    );
  }

  function getHtml(template) {
    return template.join('\n');
  }
}

function t(key, data) {
  let defaultKey = key;
  if (typeof key === 'string') {
    let keyArr = key.split('.');
    defaultKey = keyArr[keyArr.length - 1];
  }
  let result = widgetContext.translate.instant(key, data);
  if (result == key) {
    return defaultKey;
  }
  return result;
}
