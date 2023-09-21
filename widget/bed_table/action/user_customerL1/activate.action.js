let $injector = widgetContext.$scope.$injector;
let dialogs = $injector.get(widgetContext.servicesMap.get('dialogs'));
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let userService = $injector.get(widgetContext.servicesMap.get('userService'));

openActivateEntityDialog();

function openActivateEntityDialog() {
  customDialog.customDialog(htmlTemplate, ActivateEntityDialogController).subscribe();
}

function ActivateEntityDialogController(instance) {
  let vm = instance;
  const originWidth = widgetContext.settings.widget.originWidth;
  vm.fontSize = _.round((widgetContext.width / originWidth) * 10, 2);
  vm.entityName = entityName;
  vm.active = false;
  vm.action = '';
  vm.activationLink = '';
  vm.activateEntityFormGroup = vm.fb.group({});
  if (_.isNil(vm.phase)) {
    vm.phase = 0;
  }

  if (vm.phase == 0) {
    userService.getUser(entityId.id).subscribe(user => {
      vm.user = user;
      if (
        !_.isNil(user.additionalInfo.userPasswordHistory) &&
        Object.keys(user.additionalInfo.userPasswordHistory).length > 0
      ) {
        vm.active = true;
        vm.action = '활성화';
      } else {
        vm.action = '활성화';
      }
    });
  }

  vm.cancel = function () {
    delete vm.phase;
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    vm.activateEntityFormGroup.markAsPristine();
    if (vm.active === true) {
      window.alert('이미 활성화된 계정입니다.');
    } else {
      if (vm.phase == 0) {
        if (vm.action == '초기화') {
          widgetContext.http.post(`/api/noauth/resetPasswordByEmail`, { email: vm.user.email }).subscribe(() => {
            delete vm.phase;
            window.alert(`사용자 이메일인 ${vm.user.email}로 활성링크를 전송했습니다.`);
            widgetContext.updateAliases();
            vm.dialogRef.close(null);
          });
        } else {
          vm.phase = 1;
          userService.getActivationLink(vm.user.id.id).subscribe(link => {
            vm.activationLink = link;
          });
        }
      }
    }
  };

  vm.copy = function (e) {
    let $link = $('.label', e.target.parentNode.parentNode);
    let range = document.createRange();
    range.selectNode($link[0].childNodes[0]);
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeRange(range);
    window.alert('활성링크를 복사했습니다.');
  };

  vm.link = function (e) {
    window.open(vm.activationLink);
  };
}
