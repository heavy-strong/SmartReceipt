let modal = ''
let tempList = []
let timer = null
let active = false

$(function () {
    // $('#Receipt').show();
    let obj = `<p class="is-empty default hide">등록된 영수증이 없습니다.</p>
<p class="is-empty search hide">검색된 영수증이 없습니다.</p>
<canvas id="canvas" width="330" height="420" class="hide"></canvas>
<a href="#" download="" id="down" class="hide"></a>`
    let style = `<style>
    .hide { display: none; }
    mark { background: #00d1b2; color: #fff; }
    .is-empty { font-size: 1.5em; text-align: center; }
</style>`

    $('.main').append(obj)
    $('head').append(style)
    updateList()
})

$(document).on('click', '.modal-button', function () {
    let mode = $(this).data('target')
    modal = '#' + mode
    $(modal).show()

    if (mode === 'Delete' || mode === 'Download' || mode === 'Export') {
        selModal()
    } else {
        onModal(mode)
    }
})

function onModal(mode) {
    switch (mode) {
        case 'Receipt':
            listChk()
            break
        case 'Initialization':
            onDB('read', null, function (res) {
                $(modal).find('span strong').text(res.length)
            })
            break
        case 'DetailDownload':
            let idx = $('.is-active').data('idx').toString()
            onDB('get', idx, function (res) {
                let e = res
                let kb = `<span class="tag is-info">${e.size}Kb</span>`
                $(modal).find('td a').text(e.card.approval + '.json').append(kb)
            })
    }
}

function selModal() {
    let obj = $('.is-focused')

    let text = `<tr class="temp-list">
<td class="has-text-centered"> <span>총 <strong>${obj.length}</strong>개의 영수증이 선택되었습니다.</span></td>
</tr>`

    $(modal).find('table').append(text)

    $(obj).each(function (i, e) {
        let idx = $(e).data('idx').toString()

        onDB('get', idx, function (res) {
            let list = `<tr class="temp-list" data-idx="${res.card.approval}">
<td>
<a>${res.card.approval}.json <span class="tag is-info">${res.size}Kb</span></a>
</td>
</tr>`
            $(modal).find('table').append(list)
        })
    })

    listChk('sel')
}


// 초기화 버튼
$(document).on('click', '#Initialization .button:eq(0)', function () {
    onDB('clear', null, function () {
        alert('모든 영수증이 삭제되었습니다.');
        close()
        updateList()
    })
})

$(document).on('click', '.modal-close', function () {
    close()
})

function close() {
    tempList = []
    $(modal).hide()
    $('.modal tr').show()
    $('.temp-list').remove()
    $('#upfile').remove()
    $('.is-focused').removeClass('is-focused');
}

$(document).on('click', '#Receipt .button:eq(0)', function () {
    let upfile = "<input type='file' id='upfile' class='hide' multiple>"
    $(modal).append(upfile)
    $('#upfile').click()
})

$(document).on('change', '#upfile', function () {
    addList()
})

function addList() {
    let list = ''
    let jsonChk = true
    let file = $('#upfile')[0].files

    $(file).each(function (i, e) {
        // 소문자화 시킴.
        let type = e.name.toLowerCase().split('.')

        // json 구조 확인
        if (type[1] !== 'json') {
            alert('json파일만 선택 할 수 있습니다.')
            jsonChk = false
        }

        // let kb = Math.ceil(e.size / 1024)
        let kb = (e.size / 1024).toFixed(2);

        list += `<tr class='temp-list' data-idx='${type[0]}'>
            <td><a>${e.name} <span class="tag is-info">${kb}Kb</span></a>
            <button class="delete is-pulled-right"></button></td>
            </tr>`
    })

    if (jsonChk) {
        $(file).each(function (i, e) {
            tempList.push(e)
        })

        $('#Receipt table').append(list)
        listChk()
    }
}

$(document).on('click', '#Receipt .temp-list button', function () {
    let idx = $(this).parents('tr').index() - 1
    tempList.splice(idx, 1)

    $(this).parents('tr').remove()

    listChk()
})

// 목록 확인
function listChk(sel) {
    // sel이 있으면... 선택이면 is-focused의 길이를 가져오고 아니면 tempList의 길이를 가져온다...
    let length = sel ? $('.is-focused').length : $('.temp-list').length

    if (length > 0) {
        // select 모드의 갯수 세기
        $('.temp-list strong').text(length)

        $(modal).find('tr:first').hide()
        $(modal).find('.button:last').attr('disabled', false)
    } else {
        $(modal).find('.temp-list').remove()

        $(modal).find('tr:first').show()
        $(modal).find('.button:last').attr('disabled', true)
    }
}

$(document).on('click', '#Receipt .button:eq(1)', function () {
    upload()
})

function upload() {
    let length = tempList.length

    $(tempList).each(function (i, e) {
        // let kb = Math.ceil(e.size / 1024)
        let kb = (e.size / 1024).toFixed(2);
        let fr = new FileReader()
        fr.readAsText(e)
        fr.onload = function () {
            try {
                let obj = JSON.parse(this.result)
                obj.size = kb

                onDB('put', obj, function () {
                    if (i + 1 === length) {
                        alert('영수증이 추가되었습니다.')
                        close()
                        updateList()
                    }
                })
            } catch (error) {
                alert('json 형식이 아닙니다..');
            }
        }
    })
}

$(document).on('click', '#Export .button:eq(0)', function () {
    exp('sel')
})
$(document).on('click', '#Export .temp-list button', function () {
    let idx = $(this).parents('tr').data('idx')
    $(`.list a[data-idx="${idx}"]`).removeClass('is-focused')
    $(this).parents('tr').remove()
    listChk('sel')
})

function exp(sel) {
    let obj = sel ? $('.temp-list[data-idx]') : $('.is-active')

    let length = obj.length

    $(obj).each(function (i, e) {
        let idx = $(e).data('idx').toString()
        onDB('get', idx, function (res) {
            let e = res
            delete e.size

            let text = JSON.stringify(e)

            let file = new Blob([text], {type: 'text/json'})

            $('#down').attr({
                'href': URL.createObjectURL(file),
                'download': e.card.approval + '.json'
            })[0].click()

            if (i + 1 === length) {
                alert('스마트영수증이 다운로드 되었습니다.')
                $('.list a').removeClass('is-focused')
                close()
            }
        })
    })
}

// 선택 다운로드 모달
$(document).on('click', '#Download .button:eq(0)', function () {
    down('sel')
})
$(document).on('click', '#Download .temp-list button', function () {
    let idx = $(this).parents('tr').data('idx')
    $('.list a[data-idx="' + idx + '"]').removeClass('is-focused')
    $(this).parents('tr').remove()
    listChk('sel')
})

function down(sel) {
    let obj = sel ? $('.temp-list[data-idx]') : $('.is-active')
    let length = obj.length

    $(obj).each(function (i, e) {
        let idx = $(e).data('idx').toString()
        onDB('get', idx, function (res) {
            let e = res

            let type = $(modal).find('input:checked').next().text()
            let pay = e.transaction.classification === "Payment" ? "결제" : "취소"
            let online = e.transaction.type === "Offline" ? "오프라인" : "온라인"
            let card = e.card.information === "MASTER" ? "마스터카드" : "비자카드"
            let addr = e.more.address.substr(0, 26)
            let total = e.transaction.amount
            let amount = (total * 0.95).toLocaleString() + '원'
            let tax = (total * 0.05).toLocaleString() + '원'
            pay = online + " " + pay
            total = total.toLocaleString() + '원'

            // 영수증 그리기
            let canvas = $('#canvas')[0]
            let ctx = canvas.getContext('2d')

            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, 330, 420)

            ctx.font = "24px sans-serif"
            ctx.fillStyle = "black"
            ctx.fillText("스마트영수증", 90, 50)

            ctx.font = "18px sans-serif"
            ctx.fillText("[ " + pay + " ]", 90, 200)

            ctx.font = "12px sans-serif"
            ctx.fillText("사용처 : " + e.more.name, 20, 90)
            ctx.fillText("가맹점번호 : " + e.more.number, 20, 110)
            ctx.fillText("전화번호 : " + e.more.call, 20, 130)
            ctx.fillText("주소 : " + addr, 20, 150)

            ctx.fillText("카드종류 : " + card, 20, 230)
            ctx.fillText("카드번호 : " + e.card.number, 20, 250)
            ctx.fillText("거래승인 : " + e.card.approval, 20, 270)
            ctx.fillText("거래일시 : " + e.transaction.date + " " + e.transaction.time, 20, 290)

            ctx.fillText("거래금액 : ", 20, 330)
            ctx.fillText("부가 : ", 20, 350)
            ctx.fillText("합계 : ", 20, 370)

            ctx.textAlign = "right"
            ctx.fillText(amount, 310, 330)
            ctx.fillText(tax, 310, 350)
            ctx.fillText(total, 310, 370)

            ctx.textAlign = "left"
            ctx.fillText("감사합니다!", 20, 405)

            // 점선그리기 대시가 4인 점선
            ctx.setLineDash([4])
            ctx.beginPath()
            // X 20 Y 170 이동 후 라인 그리기
            ctx.moveTo(20, 170)
            ctx.lineTo(310, 170)

            ctx.moveTo(20, 305)
            ctx.lineTo(310, 305)
            ctx.moveTo(20, 385)
            ctx.lineTo(310, 385)
            ctx.stroke()

            let src = canvas.toDataURL()
            $('#down').attr({
                'href': src,
                'download': e.card.approval + '.' + type
            })[0].click()

            if (i + 1 === length) {
                alert('스마트영수증이 다운로드 되었습니다.')
                $('.list a').removeClass('is-focused')
                close()
            }
        })
    })
}

// 선택삭제
$(document).on('click', '#Delete .button:eq(0)', function () {
    del('sel')
})

function del(sel) {
    let obj = sel ? $('.temp-list[data-idx]') : $('.is-active')

    let length = obj.length

    $(obj).each(function (i, e) {
        let idx = $(e).data('idx').toString()
        onDB('delete', idx, function (res) {
            if (i + 1 === length) {
                alert('선택된 영수증이 삭제되었습니다.')
                $('.list a').removeClass('is-focused')
                close()
                updateList()
            }
        })
    })
}

// 삭제 모달창의 리스트 삭제
$(document).on('click', '#Delete .temp-list button', function () {
    let idx = $(this).parents('tr').data('idx')
    $('.list a[data-idx="' + idx + '"]').removeClass('is-focused')
    $(this).parents('tr').remove()
    listChk('sel')
})

// 영수증 선택 및 액티브
$(document).on('mousedown', '.panel a[data-idx]', function () {
    active = false
    timer = setTimeout(function (obj) {
        active = true
        obj.toggleClass('is-focused')
    }, 500, $(this))
})
$(document).on('mouseup', '.panel a[data-idx]', function () {
    clearTimeout(timer)

    if (!active) {
        $('.is-active').removeClass('is-active')
        $(this).addClass('is-active')
        view()
    }
})
// 영수증 상세보기 && 일반보기
$(document).on('click', '.detail-content a', function () {
    $('.detail-content a').toggleClass('hide')
    $('.detail-content h3').nextAll('p').toggleClass('hide')
})

// 검색 마우스
$(document).on('click', '.search-button', function () {
    // let word = $.trim($('input.is-rounded').val())
    let word = $('input.is-rounded').val().trim()

    updateList(word)
})
// 검색 엔터
$(document).on('keyup', 'input.is-rounded', function (e) {
    if (e.keyCode === 13) {
        var word = $('input.is-rounded').val().trim()
        // console.log(word.length)
        updateList(word)
    }
})

// 현재 액티브 된거
$(document).on('click', '.detail .control:eq(0)', function () {
    exp()
})
$(document).on('click', '#DetailDownload .button:eq(0)', function () {
    down()
})
$(document).on('click', '.detail .control:eq(2)', function () {
    del()
})

function updateList(word) {
    getGraph()

    $('.panel').empty()
    let tempDate = ''

    onDB('read', null, function (res) {
        let arr = res

        // 날짜 + 시간 내림차순 (즉, 최근순)
        arr.sort(function (a, b) {
            return a.transaction.date + a.transaction.time > b.transaction.date + b.transaction.time ? -1 : 1
        })

        if (arr.length === 0) {
            $('.detail').hide()
            $('.is-empty.default').show()
        } else {
            $('.detail').show()
            $('.is-empty').hide()

            $(arr).filter(function (i, e) {
                var cho = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
                let search = ''
                let chk = true

                let start = 0
                let s_chk = 0

                if (word) {
                    let name = e.more.name
                    let length = word.length

                    for (let j = 0; j <= name.length - length; j++) {
                        let match = true
                        // 내가 입력한 글자 수만큼의 글자의 조합을 생성..
                        let str = name.substr(j, length)

                        for (let k = 0; k < length; k++) {
                            // 글자 하나하나를 가져와서 비교한다.
                            let find = str.charAt(k)
                            let input = word.charAt(k)

                            // 검색한 리스트랑 내가 입력한 글자가 서로 다를때..
                            if (find != input) {
                                // 내가 입력한 글자가 초성이 아니면 이미 매칭이 안되는거고, 초성인데 찾는글자의 초성이랑 달라도 아닌것이다..
                                if ($.inArray(input, cho) == -1) {
                                    match = false
                                } else if (input != choHan(find)) {
                                    match = false
                                }
                            }
                        }

                        if (match) {
                            start = j
                            s_chk++
                        }
                    }
                    // 정답인게 하나라도 있으면 내가 입력한거랑 시작 끝 지점 보여줌
                    if (s_chk > 0) {
                        search = `data-word="${word}" data-start="${start}"`;
                    } else {
                        chk = false;
                    }
                } else {
                    $('input.is-rounded').val('')
                }

                if (!chk) {
                    return false
                }

                let days = ['일', '월', '화', '수', '목', '금', '토']
                let date = new Date(e.transaction.date)

                let day = days[date.getDay()]
                let idx = e.card.approval

                let year = e.transaction.date.substr(2)

                if (tempDate !== e.transaction.date) {
                    let dayBlock = '<a class="panel-block panel-date">' +
                        '    <span class="panel-icon">' +
                        '      <i class="far fa-calendar-alt"></i>' +
                        '    </span>' +
                        '    <small>' + year + ' (' + day + ')</small>' +
                        '</a>';
                    $('.panel').append(dayBlock);
                }

                let obj
                // 상태가 결제였으면 카드를 선택함
                if (e.transaction.classification === 'Payment') {
                    let card = e.card.information === 'VISA' ? "cc-visa" : "cc-mastercard";
                    obj = '<a class="panel-block" data-idx="' + idx + '"' + search + '>' +
                        '    <span class="panel-icon">' +
                        '      <i class="fab fa-' + card + '" aria-hidden="true"></i>' +
                        '    </span>' +
                        '    <small>' + e.more.name + ' [' + e.card.approval + '.json]</small>' +
                        '    <span class="panel-price is-pulled-right has-text-danger">' +
                        '        -' + e.transaction.amount.toLocaleString() + '<small>원</small>' +
                        '    </span>' +
                        '</a>';
                } else {
                    obj = '<a class="panel-block" data-idx="' + idx + '"' + search + '>' +
                        '    <span class="panel-icon">' +
                        '      <i class="fas fa-undo" aria-hidden="true"></i>' +
                        '    </span>' +
                        '   <small>' + e.more.name + ' [' + e.card.approval + '.json]</small>' +
                        '    <span class="panel-price is-pulled-right has-text-link">' +
                        '        +' + e.transaction.amount.toLocaleString() + '<small>원</small>' +
                        '    </span>' +
                        '</a>';
                }

                // 목록저장
                $('.panel').append(obj)
                tempDate = e.transaction.date
            })

            if ($('.panel > a').length === 0) {
                $('.detail').hide()
                $('.is-empty.search').show()
            } else {
                $('.panel > a:eq(1)').addClass('is-active')
                view()
            }
        }
    })
}

function view() {
    if ($('.is-active').length === 0) {
        return false
    }

    let idx = $('.is-active').data('idx').toString()

    onDB('get', idx, function (res) {
        let e = res
        let name = e.more.name
        let search = $('.is-active').data('word')

        // 검색어가 있으면. 즉.. 검색 결과가 있으면
        if (search) {
            let start = $('.is-active').data('start')
            let length = search.length

            name = name.slice(0, start) + '<mark>' + name.slice(start, start + length) + '</mark>' + name.slice(start + length)
        }

        let days = ['일', '월', '화', '수', '목', '금', '토'];
        let date = new Date(e.transaction.date);
        // 날짜 가져오기
        let day = days[date.getDay()];
        let card = e.card.information === "MASTER" ? "마스터카드" : "비자카드";
        let logo = e.card.information === "MASTER" ?
            '<span class="is-pulled-right card-master"><i class="fab fa-cc-mastercard"></i>&nbsp;마스터카드</span>' :
            '<span class="is-pulled-right card-visa"><i class="fab fa-cc-visa"></i>&nbsp;비자카드</span>';
        let pay = e.transaction.classification === "Payment" ? "결제" : "취소";
        let type = e.transaction.classification === "Payment" ? "danger" : "link";
        let online = e.transaction.type === "Offline" ? "오프라인" : "온라인";

        let obj = `<h1>${pay}
            <a class="button is-pulled-right is-rounded">상세보기</a>
            <a class="button is-pulled-right is-rounded hide">일반보기</a>
            </h1>
            <p>${e.transaction.date} (${day}) ${e.transaction.time}</p>
            <h3>${name}${logo}</h3>
            <hr>
            <h1 class="is-marginless has-text-right">
            <span class="is-pulled-left">거래금액</span>
            <span class="has-text-${type}">${e.transaction.amount.toLocaleString()}<small>원</small></span>
            </h1>
            <p class="is-marginless has-text-right hide">
            <span class="is-pulled-left">거래시각</span>
            <span>${e.transaction.date} (${day}) ${e.transaction.time}</span>
            </p>
            <p class="is-marginless has-text-right hide">
            <span class="is-pulled-left">거래구분</span>
            <span>${pay}</span>
            </p>
            <p class="has-text-right hide">
            <span class="is-pulled-left">거래형태</span>
            <span>${online}</span>
            </p>
            <p class="is-marginless has-text-right hide">
            <span class="is-pulled-left">카드정보</span>
            <span>${card}</span>
            </p>
            <p class="is-marginless has-text-right hide">
            <span class="is-pulled-left">카드번호</span>
            <span>${e.card.number}</span>
            </p>
            <p class="has-text-right hide">
            <span class="is-pulled-left">승인번호</span>
            <span>${e.card.approval}</span>
           </p>
           <p class="is-marginless has-text-right hide">
               <span class="is-pulled-left">사용처</span>
               <span>${name}</span>
           </p>
           <p class="is-marginless has-text-right hide">
               <span class="is-pulled-left">주소</span>
               <span>${e.more.address}</span>
           </p>
           <p class="is-marginless has-text-right hide">
                <span class="is-pulled-left">전화번호</span>
                <span>${e.more.call}</span>
            </p>`
        $('.detail-content').html(obj)
    })
}

// db
function onDB(mode, data, callback) {
    let db = indexedDB.open('0102', 1)

    db.onupgradeneeded = function () {
        this.result.createObjectStore('receipt', {keyPath: 'card.approval', autoIncrement: false})
    }

    db.onsuccess = function () {
        let store = this.result.transaction('receipt', 'readwrite').objectStore('receipt')
        let res = ''
        switch (mode) {
            case 'put':
                res = store.put(data)
                break
            case 'get':
                res = store.get(data)
                break
            case 'read':
                res = store.getAll()
                break
            case 'delete':
                res = store.delete(data)
                break
            case 'clear':
                res = store.clear()
                break
        }
        res.onsuccess = function () {
            if (callback) callback(this.result)
        }
    }
}

function choHan(str) {
    var cho = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    var result = ''
    for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            result += cho[Math.floor(code / 588)];
        }
    }
    return result;
}

function getGraph() {
    if (!$('#graph').length) {
        $('.detail').append("<canvas id='graph' style='background: #fff; padding: 40px 60px 40px 20px;' width='500px' height ='320px'></canvas>")
    }
    let graph = {}
    let max = -99999

    onDB('read', null, function (res) {
        let arr = res;
        $(arr).each(function (i, e) {
            let month = parseInt(e.transaction.date.split('.')[1]);
            let money = 0;
            if (e.transaction.classification !== 'Cancellation') {
                // console.log('취소건은 합산안함');
                money = e.transaction.amount;
            }
            if (graph[month] === undefined) {
                graph[month] = money;
            } else {
                graph[month] += money;
            }
        })


        let len = 0;
        Object.keys(graph).forEach(function (e, i) {
            if (max < graph[e]) {
                max = graph[e]
            }
            len++
        })
        max = Math.ceil(max / 10000);

        let canvas = $('#graph')[0];
        let ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white'
        ctx.fill();
        ctx.font = '13px 맑은고딕';
        ctx.fillStyle = 'black';
        for (let i = 1; i <= max; i++) {
            ctx.beginPath();
            ctx.fillText(`${i}만`, 0, 312 - (300 / max * i))
            ctx.strokeStyle = '#ddd'
            ctx.lineWidth = 1;
            ctx.moveTo(40, 306.5 - (300 / max * i))
            ctx.lineTo(500, 306.5 - (300 / max * i))
            ctx.stroke()
            ctx.closePath();

        }

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.moveTo(40, 6.5)
        ctx.lineTo(40, 300)

        ctx.moveTo(39, 301)
        ctx.lineTo(500, 301)

        ctx.stroke();
        ctx.closePath();

        Object.keys(graph).forEach(function (e, i) {
            ctx.beginPath();

            ctx.moveTo(500 / (len + 1) * (i + 1) + 15, 306.5 - (300 / max * (graph[e] / 10000)))
            ctx.lineTo(500 / (len + 1) * (i + 1) + 15, 300)
            ctx.lineWidth = 30;
            ctx.strokeStyle = '#89E1E3';
            ctx.stroke()

            ctx.fillStyle = 'black';
            ctx.fillText(`${e}월`, (500 / (len + 1) * (i + 1) + 5), 319);

            ctx.closePath();
        })
    })
}