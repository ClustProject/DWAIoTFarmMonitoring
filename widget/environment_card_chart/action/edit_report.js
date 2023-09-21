let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let assetService = $injector.get(widgetContext.servicesMap.get('assetService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));

const t = widgetContext.custom.t;

openEditEntityDialog();

function openEditEntityDialog() {
  customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();
}

function EditEntityDialogController(instance) {
  let vm = instance;
  vm.ownerId = widgetContext.defaultSubscription.configuredDatasources[0].entity.id;
  vm.ownerLevel = widgetContext.$scope.ownerLevel;
  vm.t = t;
  vm.currentStep = 0;
  vm.newEmail = '';
  vm.emailList = [];
  if (additionalParams.receiver) {
    vm.emailList = additionalParams.receiver.split(',');
  }
  vm.customerL1List = [{ name: t('thingplus.selector.entire-customerL1'), value: '' }];
  vm.customerL2List = [{ name: t('thingplus.selector.entire-customerL2'), value: '' }];
  if (vm.ownerLevel == 0) {
    vm.customerL1List = vm.customerL1List.concat(
      widgetContext.custom.customerL1List
        .map(x => {
          return {
            name: x.name,
            value: x.id.id,
          };
        })
        .sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        })
    );
  }
  if (vm.ownerLevel <= 1) {
    vm.customerL2List = vm.customerL2List.concat(
      widgetContext.custom.customerL2List
        .map(x => {
          return {
            name: x.name,
            value: x.id.id,
          };
        })
        .sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        })
    );
  }
  vm.dayList = [
    { name: t('thingplus.time-format.weekday-long.mon'), value: 0 },
    { name: t('thingplus.time-format.weekday-long.tue'), value: 1 },
    { name: t('thingplus.time-format.weekday-long.wed'), value: 2 },
    { name: t('thingplus.time-format.weekday-long.thr'), value: 3 },
    { name: t('thingplus.time-format.weekday-long.fri'), value: 4 },
    { name: t('thingplus.time-format.weekday-long.sat'), value: 5 },
    { name: t('thingplus.time-format.weekday-long.sun'), value: 6 },
  ];
  vm.dateList = [];
  for (let i = 1; i <= 31; i++) {
    vm.dateList.push({ name: t('thingplus.time-format.day-value', { day: i }), value: i });
  }
  let customerL1Name = t('thingplus.selector.entire-customerL1');
  if (additionalParams.customerL1 && additionalParams.customerL1 != '') {
    customerL1Name = widgetContext.custom.relations[additionalParams.customerL1].name;
  }
  let customerL2Name = t('thingplus.selector.entire-customerL2');
  if (additionalParams.customerL2 && additionalParams.customerL2 != '') {
    customerL2Name = widgetContext.custom.relations[additionalParams.customerL2].name;
  }
  let dailyContent = [true, true, true, true, true, true, true];
  if (additionalParams.reportType == 'DAILY') {
    dailyContent = [false, false, false, false, false, false, false];
    let list = additionalParams.reportContent.split(',');
    for (let i in list) {
      if (list[i]) {
        dailyContent[list[i]] = true;
      }
    }
  }
  let reportTime = moment().startOf('day').valueOf() + Number(additionalParams.reportTime);
  vm.editEntityFormGroup = vm.fb.group({
    customerL1Name: [customerL1Name],
    customerL2Name: [customerL2Name],
    reportType: [additionalParams.reportType],
    reportTime: [moment(reportTime).toDate()],
    dailyContent: vm.fb.group({
      0: [dailyContent[0]],
      1: [dailyContent[1]],
      2: [dailyContent[2]],
      3: [dailyContent[3]],
      4: [dailyContent[4]],
      5: [dailyContent[5]],
      6: [dailyContent[6]],
    }),
    weeklyContent: [additionalParams.reportType == 'WEEKLY' ? additionalParams.reportContent : 0],
    monthlyContent: [additionalParams.reportType == 'MONTHLY' ? additionalParams.reportContent : 1],
    customContent: [additionalParams.reportType == 'CUSTOM' ? additionalParams.reportContent : 2],
    newEmail: [''],
  });
  if (vm.ownerLevel == 0) {
    vm.editEntityFormGroup.controls.customerL1 = vm.fb.control(additionalParams.customerL1);
  }
  if (vm.ownerLevel <= 1) {
    vm.editEntityFormGroup.controls.customerL2 = vm.fb.control(additionalParams.customerL2);
  }

  vm.calcFontSize = function () {
    const originWidth = widgetContext.settings.widget.originWidth;
    let widgetFontSize = _.round((widgetContext.width / originWidth) * 10, 2);
    if (widgetFontSize < 6.25) {
      widgetFontSize = 6.25;
    }
    return widgetFontSize;
  };
  vm.cancel = function () {
    vm.dialogRef.close(null);
  };
  vm.save = function () {
    vm.editEntityFormGroup.markAsPristine();
    if (vm.emailList.length == 0) {
      window.alert(t('thingplus.help.error-required-receiver'));
      return;
    }
    saveAttribute(entityId).subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
    });
  };
  vm.selectStep = function (e, index) {
    vm.currentStep = index;
  };
  vm.prevStep = function () {
    vm.currentStep--;
  };
  vm.nextStep = function () {
    vm.currentStep++;
  };
  vm.setCustomerL1 = function (e) {
    let customerL1 = vm.editEntityFormGroup.get('customerL1').value;
    vm.customerL2List = [{ name: t('thingplus.selector.entire-customerL2'), value: '' }];
    vm.editEntityFormGroup.patchValue(
      {
        customerL2: '',
      },
      { emitEvent: false }
    );
    vm.customerL2List = vm.customerL2List.concat(
      widgetContext.custom.customerL2List
        .filter(x => {
          return customerL1 == '' || x.parent.id.id == customerL1;
        })
        .map(x => {
          return {
            name: x.name,
            value: x.id.id,
          };
        })
        .sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        })
    );
  };
  vm.setReportType = function (e, type) {
    vm.editEntityFormGroup.patchValue(
      {
        reportType: type,
      },
      { emitEvent: false }
    );
  };
  vm.addEmail = function (e) {
    let newEmail = vm.editEntityFormGroup.get('newEmail');
    if (newEmail.hasError('email')) return;
    if (newEmail.value != '') {
      vm.emailList.push(newEmail.value);
      vm.editEntityFormGroup.patchValue(
        {
          newEmail: '',
        },
        { emitEvent: false }
      );
    }
  };
  vm.deleteEmail = function (e, email) {
    let targetIndex = vm.emailList.indexOf(email);
    vm.emailList.splice(targetIndex, 1);
  };

  function saveAttribute(asset) {
    let customerL1Id = '',
      customerL2Id = '';
    if (vm.ownerLevel == 0) {
      customerL1Id = vm.editEntityFormGroup.get('customerL1').value;
      customerL2Id = vm.editEntityFormGroup.get('customerL2').value;
    } else if (vm.ownerLevel == 1) {
      customerL1Id = entityId.id;
      customerL2Id = vm.editEntityFormGroup.get('customerL2').value;
    } else {
      customerL2Id = entityId.id;
      customerL1Id = widgetContext.custom.relations[customerL2Id].parent.id.id;
    }
    let reportType = vm.editEntityFormGroup.get('reportType').value;
    let reportTime = vm.editEntityFormGroup.get('reportTime').value;
    reportTime = moment(reportTime).hour() * 3600000 + moment(reportTime).minute() * 60000;
    let reportContent = '';
    if (reportType == 'DAILY') {
      reportContent = vm.editEntityFormGroup.get('dailyContent').value;
      let result = [];
      for (let i in reportContent) {
        if (reportContent[i]) {
          result.push(i);
        }
      }
      reportContent = result.join(',');
    } else if (reportType == 'WEEKLY') {
      reportContent = vm.editEntityFormGroup.get('weeklyContent').value;
    } else if (reportType == 'MONTHLY') {
      reportContent = vm.editEntityFormGroup.get('monthlyContent').value;
    } else {
      reportContent = vm.editEntityFormGroup.get('customContent').value;
    }
    let reportPage = [
      {
        dashboardId: widgetContext.custom.dashboardList['Report'].id.id,
        stateId: 'default',
      },
    ];

    let attributeBody = [
      { key: 'customerL1', value: customerL1Id },
      { key: 'customerL2', value: customerL2Id },
      { key: 'reportType', value: reportType },
      { key: 'reportTime', value: reportTime },
      { key: 'reportContent', value: reportContent },
      { key: 'reportPage', value: reportPage },
      { key: 'reportUpdateTime', value: moment().valueOf() },
      { key: 'receiver', value: vm.emailList.join(',') },
    ];
    return attributeService.saveEntityAttributes(asset, 'SERVER_SCOPE', attributeBody);
  }
}
