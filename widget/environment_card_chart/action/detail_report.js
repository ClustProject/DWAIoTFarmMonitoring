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
  vm.emailList = [];
  if (additionalParams.receiver) {
    vm.emailList = additionalParams.receiver.split(',');
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

  vm.detailEntityFormGroup = vm.fb.group({
    customerL1Name: [customerL1Name],
    customerL2Name: [customerL2Name],
    reportType: [additionalParams.reportType],
    reportTime: [moment(+additionalParams.reportTime).format('HH:mm')],
    dailyContent: vm.fb.group({
      0: [dailyContent[0]],
      1: [dailyContent[1]],
      2: [dailyContent[2]],
      3: [dailyContent[3]],
      4: [dailyContent[4]],
      5: [dailyContent[5]],
      6: [dailyContent[6]],
    }),
    weeklyContent: [vm.dayList[additionalParams.reportType == 'WEEKLY' ? additionalParams.reportContent : 0].name],
    monthlyContent: [additionalParams.reportType == 'MONTHLY' ? additionalParams.reportContent : 1],
    customContent: [additionalParams.reportType == 'CUSTOM' ? additionalParams.reportContent : 2],
  });
  if (vm.ownerLevel == 0) {
    vm.detailEntityFormGroup.controls.customerL1 = vm.fb.control(additionalParams.customerL1);
  }
  if (vm.ownerLevel <= 1) {
    vm.detailEntityFormGroup.controls.customerL2 = vm.fb.control(additionalParams.customerL2);
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
}
